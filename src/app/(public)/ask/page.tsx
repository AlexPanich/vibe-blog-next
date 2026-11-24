import { resource } from "@/core/resource";
import PostAsk from "@/domains/posts/components/ask/PostAsk";
import { ASK_EXAMPLES } from "@/domains/posts/shared/postAsk";
import { askEnabled } from "@/domains/posts/shared/postAskRun";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import z from "zod";

// askEnabled зависит от env рантайма: при сборке ключей может не быть
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Спросить блог',
  description: 'Задайте вопрос — ответ соберётся из опубликованных историй блога со ссылками на них.'
};

/*
  «Спросить блог» (спека 57): без генерации или эмбеддингов фичи нет целиком (п. 1). Вопрос не
  попадает в URL — открытие ссылки не вызывает модель (п. 2)
*/
export default function Ask() {
  if(!askEnabled){
    notFound();
  }

  return (
    <div className="ui-ask-page">
      <div className="ui-section-head">
        <div>
          <p className="ui-kicker">ИИ по историям блога</p>
          <h1 className="ui-title">Спросить блог</h1>
          <p className="ui-ask-page__lead">
            Ответ собирается из опубликованных постов, у каждого утверждения — ссылка на историю, откуда оно взято.
          </p>
        </div>
      </div>
      <PostAsk examples={resource(z.array(z.string()), ASK_EXAMPLES)} />
    </div>
  );
}
