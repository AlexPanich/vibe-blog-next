'use client'

import 'client-only';
import Link from "@/components/general/Link";
import type { PostAskState } from "@/domains/posts/hooks/usePostAsk";
import { parseAskAnswer } from "@/domains/posts/shared/postAskText";
import PostAskSources from "@/domains/posts/components/ask/PostAskSources";
import { Alert } from "@mantine/core";

type PostAskAnswerProps = {
  state: PostAskState
}

/*
  Ответ (спека 57, п. 3, 9–10, 13): абзацы как текст, сноски [n] — ссылки на посты. Курсор — пока
  печатается. Сбой после текста — пометка под ним, без текста — Alert
*/
export default function PostAskAnswer({ state }: PostAskAnswerProps) {
  const { phase, sources, text, error } = state;
  const { paragraphs, cited } = parseAskAnswer(text, sources.length);
  const byN = new Map(sources.map(source => [ source.n, source ]));
  const typing = phase === 'answering';
  const nothing = phase === 'done' && sources.length === 0;

  return (
    <section className="ui-ask__result" aria-live="polite">
      { phase === 'searching' && <p className="ui-ask__note">Ищу истории…</p> }

      { (paragraphs.length > 0 || (typing && sources.length > 0)) &&
        <div className="ui-ask__answer" aria-busy={typing}>
          { paragraphs.length === 0 && <p><span className="ui-ask__cursor" aria-hidden /></p> }
          { paragraphs.map((paragraph, i) => (
            <p key={i}>
              { paragraph.map((segment, j) => {
                const source = segment.kind === 'ref' ? byN.get(segment.n) : undefined;

                return segment.kind === 'text'
                  ? <span key={j}>{ segment.text }</span>
                  : source && <Link key={j} href={`/posts/${source.id}`} className="ui-ask-ref" aria-label={`Источник ${segment.n}`} title={source.title}>[{ segment.n }]</Link>;
              }) }
              { typing && i === paragraphs.length - 1 && <span className="ui-ask__cursor" aria-hidden /> }
            </p>
          )) }
        </div> }

      { phase === 'stopped' && <p className="ui-ask__note">Ответ остановлен</p> }

      { phase === 'failed' && error && (text.trim()
        ? <p className="ui-ask__note ui-ask__note--error">{ error }</p>
        : <Alert color="red" variant="light">{ error }</Alert>) }

      <PostAskSources sources={sources} cited={cited} nothing={nothing} typing={typing} question={state.question} />
    </section>
  );
}
