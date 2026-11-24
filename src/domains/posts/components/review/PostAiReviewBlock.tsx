'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import type { PostAiReviewBlockResource } from "@/domains/posts/dto/postAiReviewResources";
import { rerunPostAiReviewAction } from "@/domains/posts/actions/postAiReviewActions";
import { AI_VERDICT_LABELS } from "@/domains/posts/shared/postAiReviewLabels";
import PostAiReviewBody from "@/domains/posts/components/review/PostAiReviewBody";
import LocalDate from "@/components/general/LocalDate";
import useLiveEvent from "@/hooks/useLiveEvent";
import useLiveTopic from "@/hooks/useLiveTopic";
import { postTopic } from "@/shared/liveEvents";
import { Button, Loader } from "@mantine/core";
import { IconRefresh, IconSparkles } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

type PostAiReviewBlockProps<T extends PostAiReviewBlockResource> = {
  postId: number,
  block: StrictResource<T, PostAiReviewBlockResource>,
  canDecide: boolean
}

/*
  Блок «Разбор ИИ» над карточкой решения (спека 54, п. 11). Состояние приходит с сервера, по
  сигналу post.ai-review.changed страница перечитывается. Переподключение потока при pending —
  тоже: финиш мог прийти в разрыве. Решает всегда человек
*/
export default function PostAiReviewBlock<T extends PostAiReviewBlockResource>({ postId, block, canDecide }: PostAiReviewBlockProps<T>) {
  const router = useRouter();
  const rerun = useAction(rerunPostAiReviewAction.bind(null, postId));
  const { view, current, previous } = block;
  const verdict = view === 'done' ? current?.verdict : null;
  const error = rerun.result.serverError?.message;

  useLiveTopic(postTopic(postId));
  useLiveEvent('post.ai-review.changed', data => {
    if(data.postId === postId){
      router.refresh();
    }
  });
  useLiveEvent('open', () => {
    if(view === 'pending'){
      router.refresh();
    }
  });

  return (
    <section className="ui-decision ui-ai-review" aria-label="Разбор ИИ">
      <div className="ui-ai-review__head">
        <h2 className="ui-decision__title"><IconSparkles size={16} stroke={1.8} />Разбор ИИ</h2>
        { verdict && <span className="ui-ai-review__chip" data-verdict={verdict}>{ AI_VERDICT_LABELS[verdict] }</span> }
      </div>

      { view === 'pending' && <p className="ui-ai-review__state"><Loader size={14} />Читаю пост…</p> }
      { view === 'done' && current && <PostAiReviewBody review={current} canInsert={canDecide} /> }
      { view === 'failed' && <p className="ui-ai-review__state" data-tone="error">
        Не удалось разобрать{ current?.error ? `: ${current.error}` : '' }
      </p> }
      { view === 'outdated' && <p className="ui-ai-review__state">Разбор относится к прошлой отправке — текущую ИИ ещё не читал.</p> }
      { view === 'empty' && <p className="ui-ai-review__state">Пост ещё не разобран.</p> }

      { block.enabled && <div className="ui-ai-review__rerun">
        <Button
          variant="default"
          size="xs"
          leftSection={<IconRefresh size={14} stroke={2} />}
          loading={rerun.isPending}
          disabled={view === 'pending'}
          onClick={() => rerun.execute()}
        >
          { view === 'empty' || view === 'outdated' ? 'Проверить' : 'Проверить заново' }
        </Button>
        { error && <p className="ui-decision__error" role="alert">{ error }</p> }
      </div> }

      { previous && <details className="ui-ai-review__previous">
        <summary>
          Прошлая отправка, <LocalDate value={previous.submittedAt} options={{ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }} />
          { previous.verdict && <span className="ui-ai-review__chip" data-verdict={previous.verdict}>{ AI_VERDICT_LABELS[previous.verdict] }</span> }
        </summary>
        <PostAiReviewBody review={previous} canInsert={false} />
      </details> }

      <p className="ui-ai-review__foot">
        { modelLabel(view === 'outdated' ? previous?.model : current?.model) }ИИ ошибается — решение за вами
      </p>
    </section>
  );
}

function modelLabel(model: string | null | undefined){
  if(!model){
    return '';
  }

  return model === 'seed' ? 'Демо-разбор · ' : `${model} · `;
}
