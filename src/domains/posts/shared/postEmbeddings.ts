import 'server-only';
import { db } from "@/globals/db";
import { aiEmbed, embedEnabled, embedModel, LlmError } from "@/globals/ai";
import { aiConfig } from "@/config/ai";
import { postEmbeddings, posts } from "@/database/schema";
import { plainText } from "@/domains/posts/shared/postText";
import { fromBlob, toBlob } from "@/core/vectors";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { after } from "next/server";
import { createHash } from "node:crypto";

type EmbedSource = { title: string, lead: string | null, content: string };

type BackfillState = { running: boolean, failedAt: number | null };

/*
  Текст для вектора (спека 56, п. 4): заголовок, lead и плоский текст через пустую строку,
  не длиннее maxChars. Картинки и подписи к фото не учитываются
*/
export function embeddingText(post: EmbedSource){
  return [ post.title, post.lead, plainText(post.content) ]
    .map(part => part?.trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, aiConfig.embed.maxChars);
}

export function textHash(text: string){
  return createHash('sha256').update(text).digest('hex');
}

/*
  Пересчёт после перехода в published (п. 6) — в after(), после ответа action. Ошибка модели
  переход не роняет: пост досчитает добор
*/
export function startPostEmbedding(postId: number){
  if(!embedEnabled){
    return;
  }

  after(() => embedPost(postId));
}

/*
  Недостающие векторы (п. 7): опубликованные посты без вектора текущей модели. Есть такие —
  добор в after(), один на процесс; после неудачи — не раньше чем через retryMs. Текст
  опубликованного поста не меняется (реш. 8 плана), поэтому хеш здесь не сверяется
*/
export function ensureEmbeddings(){
  if(!embedEnabled){
    return;
  }

  const state = backfillState();

  if(state.running || (state.failedAt !== null && Date.now() - state.failedAt < aiConfig.embed.retryMs)){
    return;
  }

  if(missingIds(1).length === 0){
    return;
  }

  state.running = true;
  after(() => backfill(state));
}

/*
  Векторы текущей модели у опубликованных постов: все или только postIds. Читаются из базы на
  каждый запрос (реш. 7 плана): на демо-объёме это доли миллисекунды, а кэш пришлось бы сбрасывать
*/
export function loadVectors(postIds?: number[]){
  if(postIds && postIds.length === 0){
    return [];
  }

  const rows = db.select({ id: postEmbeddings.postId, vector: postEmbeddings.vector })
    .from(postEmbeddings)
    .innerJoin(posts, eq(posts.id, postEmbeddings.postId))
    .where(and(
      eq(postEmbeddings.model, embedModel),
      eq(posts.status, 'published'),
      postIds ? inArray(postEmbeddings.postId, postIds) : undefined
    ))
    .all();

  return rows.map(row => ({ id: row.id, vector: fromBlob(row.vector) }));
}

/*
  Вектор одного поста. Пост успел уйти из published — выход; совпали хеш текста и модель —
  модель не вызываем (пост вернули без правок)
*/
async function embedPost(postId: number){
  try {
    const post = db.select({ title: posts.title, lead: posts.lead, content: posts.content, status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId))
      .get();

    if(!post || post.status !== 'published'){
      return;
    }

    const text = embeddingText(post);
    const hash = textHash(text);
    const existing = db.select({ model: postEmbeddings.model, textHash: postEmbeddings.textHash })
      .from(postEmbeddings)
      .where(eq(postEmbeddings.postId, postId))
      .get();

    if(existing && existing.model === embedModel && existing.textHash === hash){
      return;
    }

    const { vectors } = await aiEmbed({ texts: [ text ], kind: 'document' });

    saveVector(postId, hash, vectors[0]);
  }
  catch(error){
    console.error('Вектор поста', postId, error instanceof LlmError ? error.message : error);
  }
}

// Пачками по batch текстов, пока недостающие не кончатся; сбой пачки останавливает добор
async function backfill(state: BackfillState){
  try {
    for(let ids = missingIds(aiConfig.embed.batch); ids.length > 0; ids = missingIds(aiConfig.embed.batch)){
      const rows = db.select({ id: posts.id, title: posts.title, lead: posts.lead, content: posts.content })
        .from(posts)
        .where(inArray(posts.id, ids))
        .all();
      const texts = rows.map(embeddingText);
      const { vectors } = await aiEmbed({ texts, kind: 'document' });

      db.transaction(tx => {
        rows.forEach((row, i) => saveVector(row.id, textHash(texts[i]), vectors[i], tx));
      });
    }

    state.failedAt = null;
  }
  catch(error){
    state.failedAt = Date.now();
    console.error('Добор векторов постов', error instanceof LlmError ? error.message : error);
  }
  finally {
    state.running = false;
  }
}

function missingIds(limit: number){
  return db.select({ id: posts.id })
    .from(posts)
    .leftJoin(postEmbeddings, and(eq(postEmbeddings.postId, posts.id), eq(postEmbeddings.model, embedModel)))
    .where(and(eq(posts.status, 'published'), isNull(postEmbeddings.postId)))
    .limit(limit)
    .all()
    .map(row => row.id);
}

function saveVector(postId: number, hash: string, vector: Float32Array, tx: Pick<typeof db, 'insert'> = db){
  const values = { model: embedModel, textHash: hash, vector: toBlob(vector), createdAt: new Date() };

  tx.insert(postEmbeddings)
    .values({ postId, ...values })
    .onConflictDoUpdate({ target: postEmbeddings.postId, set: values })
    .run();
}

// В globalThis: флаг и время неудачи переживают HMR в dev
function backfillState(): BackfillState {
  const store = globalThis as unknown as { postEmbedBackfill?: BackfillState };

  return store.postEmbedBackfill ??= { running: false, failedAt: null };
}
