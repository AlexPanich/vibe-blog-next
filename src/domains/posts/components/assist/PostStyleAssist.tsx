'use client'

import 'client-only';
import { POST_STYLE_KIND_LABELS, type PostStyleIssueResult } from "@/domains/posts/dto/postAssistResources";
import { countOccurrences } from "@/domains/posts/shared/postAssist";
import { Button, Tooltip } from "@mantine/core";
import { useState } from "react";

type PostStyleAssistProps = {
  issues: PostStyleIssueResult[],
  content: string,
  onReplace: (next: string) => void
}

type IssueState = 'open' | 'applied' | 'skipped'

const CHANGED = 'Текст изменился — проверьте заново';

/*
  Замечания о стиле (спека 55, п. 12; план, реш. 12). «Применить» — только если фрагмент
  встречается в тексте ровно один раз; «Отменить» — по тому же правилу для замены. «Применить
  все» нет: каждое замечание человек читает сам. Пропущенные скрываются
*/
export default function PostStyleAssist({ issues, content, onReplace }: PostStyleAssistProps){
  const [ states, setStates ] = useState<Record<number, IssueState>>({});
  const visible = issues.map((issue, index) => ({ issue, index, state: states[index] ?? 'open' })).filter(item => item.state !== 'skipped');

  function mark(index: number, state: IssueState){
    setStates(prev => ({ ...prev, [index]: state }));
  }

  // Функция вместо строки: $ в замене не должен работать как шаблон replace
  function swap(index: number, from: string, to: string, next: IssueState){
    if(countOccurrences(content, from) !== 1){
      return;
    }

    onReplace(content.replace(from, () => to));
    mark(index, next);
  }

  if(visible.length === 0){
    return <p className="ui-assist__state">Все замечания пропущены</p>;
  }

  return (
    <ul className="ui-assist__issues">
      { visible.map(({ issue, index, state }) => {
        const applied = state === 'applied';
        const ready = countOccurrences(content, applied ? issue.replacement : issue.quote) === 1;

        return <li key={index} className="ui-assist__issue" data-applied={applied || undefined}>
          <div className="ui-assist__issue-text">
            <span className="ui-assist__kind" data-kind={issue.kind}>{ POST_STYLE_KIND_LABELS[issue.kind] }</span>
            <p className="ui-assist__quote">
              <del>{ issue.quote }</del> <span aria-hidden>→</span> <ins>{ issue.replacement }</ins>
            </p>
            { issue.explanation && <p className="ui-assist__explanation">{ issue.explanation }</p> }
          </div>
          <div className="ui-assist__issue-buttons">
            { applied
              ? <>
                <span className="ui-assist__done">Применено</span>
                <Tooltip label={CHANGED} disabled={ready} withArrow>
                  <span>
                    <Button type="button" variant="subtle" size="compact-sm" disabled={!ready} onClick={() => swap(index, issue.replacement, issue.quote, 'open')}>
                      Отменить
                    </Button>
                  </span>
                </Tooltip>
              </>
              : <>
                <Tooltip label={CHANGED} disabled={ready} withArrow>
                  <span>
                    <Button type="button" variant="light" size="compact-sm" disabled={!ready} onClick={() => swap(index, issue.quote, issue.replacement, 'applied')}>
                      Применить
                    </Button>
                  </span>
                </Tooltip>
                <Button type="button" variant="subtle" color="gray" size="compact-sm" onClick={() => mark(index, 'skipped')}>
                  Пропустить
                </Button>
              </> }
          </div>
        </li>;
      }) }
    </ul>
  );
}
