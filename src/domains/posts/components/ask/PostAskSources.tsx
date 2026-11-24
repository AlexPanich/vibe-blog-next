'use client'

import 'client-only';
import Link from "@/components/general/Link";
import type { PostAskSourceResource } from "@/domains/posts/dto/postAskResources";
import { askFeedHref } from "@/domains/posts/shared/postAsk";
import PostAskSource from "@/domains/posts/components/ask/PostAskSource";

type PostAskSourcesProps = {
  sources: PostAskSourceResource[],
  cited: number[],
  // Поиск ничего не нашёл — генерации не было (п. 6)
  nothing: boolean,
  // Ответ ещё печатается — сносок может пока не быть
  typing: boolean,
  question: string
}

/*
  «Источники» (спека 57, п. 9): посты со сносками в порядке первого упоминания. Пока ответ печатается
  и сносок ещё нет — все переданные, после ответа без сносок блока нет (раздел 8 спеки). Номер на карточке совпадает с номером сноски в тексте (план 57, реш. 14)
*/
export default function PostAskSources({ sources, cited, nothing, typing, question }: PostAskSourcesProps) {
  if(nothing){
    return (
      <div className="ui-ask__nothing">
        <p>В блоге пока нет историй об этом.</p>
        <Link href={askFeedHref(question)}>Поискать в ленте</Link>
      </div>
    );
  }

  const shown = cited.length > 0
    ? cited.flatMap(n => sources.filter(source => source.n === n))
    : typing ? sources : [];

  if(shown.length === 0){
    return null;
  }

  return (
    <div className="ui-ask-sources-block">
      <h2 className="ui-ask-sources-block__title">Источники</h2>
      <div className="ui-ask-sources">
        { shown.map(source => <PostAskSource key={source.n} source={source} />) }
      </div>
    </div>
  );
}
