'use client'

import 'client-only';
import { checkPostStyleAction, findPostRouteAction, suggestPostLeadAction, suggestPostTagsAction, suggestPostTitleAction } from "@/domains/posts/actions/postAssistActions";
import type { PostForm } from "@/domains/posts/hooks/usePostForm";
import usePostAssist, { type PostAssistState } from "@/domains/posts/hooks/usePostAssist";
import { assistTextProblem, type PostAssistKind } from "@/domains/posts/shared/postAssist";
import PostAssistButton from "@/domains/posts/components/assist/PostAssistButton";
import PostAssistPanel from "@/domains/posts/components/assist/PostAssistPanel";
import PostVariantsAssist from "@/domains/posts/components/assist/PostVariantsAssist";
import PostTagAssist from "@/domains/posts/components/assist/PostTagAssist";
import PostStyleAssist from "@/domains/posts/components/assist/PostStyleAssist";
import PostRouteAssist, { type PostRouteAddPoint } from "@/domains/posts/components/assist/PostRouteAssist";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { ReactNode, RefObject } from "react";

export type PostFieldAssist = { action?: ReactNode, below?: ReactNode }

type PostFormAssist = Record<PostAssistKind, PostFieldAssist>

/*
  Помощник автора для полей формы (спека 55): кнопка в подписи поля (action) и блок под полем
  (below). Хуки вызываются всегда; без enabled ничего не рисуется — разметка как раньше
*/
export default function usePostFormAssist(form: PostForm, enabled: boolean, editorRef: RefObject<MDXEditorMethods | null>): PostFormAssist {
  const { data, update, assistInput } = form;
  const title = usePostAssist(suggestPostTitleAction);
  const lead = usePostAssist(suggestPostLeadAction);
  const tags = usePostAssist(suggestPostTagsAction);
  const style = usePostAssist(checkPostStyleAction);
  const route = usePostAssist(findPostRouteAction);

  if(!enabled){
    return { title: {}, lead: {}, tags: {}, style: {}, route: {} };
  }

  function button(kind: PostAssistKind, state: PostAssistState<unknown>, label: string){
    return <PostAssistButton
      label={label}
      pending={state.pending}
      disabledReason={assistTextProblem(kind, data.content)}
      onClick={() => state.run(assistInput())}
    />;
  }

  function panel<Data>(kind: PostAssistKind, state: PostAssistState<Data>, heading: string, emptyText: string, isEmpty: (data: Data) => boolean, render: (data: Data) => ReactNode){
    if(!state.open){
      return undefined;
    }

    return <PostAssistPanel
      // Панели разных полей — соседи в одном списке детей: ключ должен различаться и между ними
      key={`${kind}-${state.runs}`}
      title={heading}
      pending={state.pending}
      error={state.error}
      empty={state.data !== undefined && isEmpty(state.data)}
      emptyText={emptyText}
      onRetry={() => state.run(assistInput())}
      onClose={state.close}
    >
      { state.data !== undefined && render(state.data) }
    </PostAssistPanel>;
  }

  // Внешняя правка текста: prop markdown у MDXEditor начальный — нужен setMarkdown. В запасном поле ref пуст
  function replaceContent(next: string){
    update('content', next);
    editorRef.current?.setMarkdown(next);
  }

  // key новым точкам — заведомо не повторяющийся: больше любого текущего
  function addPoints(added: PostRouteAddPoint[]){
    const start = Math.max(-1, ...data.points.map(p => p.key)) + 1;

    update('points', [ ...data.points, ...added.map((point, i) => ({ key: start + i, ...point })) ]);
  }

  return {
    title: {
      action: button('title', title, 'Предложить'),
      below: panel('title', title, 'Варианты заголовка', 'Подходящих вариантов не нашлось', d => d.variants.length === 0,
        d => <PostVariantsAssist variants={d.variants} value={data.title} onPick={value => update('title', value)} />)
    },
    lead: {
      action: button('lead', lead, 'Написать'),
      below: panel('lead', lead, 'Варианты подзаголовка', 'Подходящих вариантов не нашлось', d => d.variants.length === 0,
        d => <PostVariantsAssist variants={d.variants} value={data.lead} onPick={value => update('lead', value)} />)
    },
    tags: {
      action: button('tags', tags, 'Подобрать'),
      below: panel('tags', tags, 'Рубрики к посту', 'Подходящих рубрик не нашлось', d => d.tags.length === 0,
        d => <PostTagAssist tags={d.tags} value={data.tagIds} onChange={ids => update('tagIds', ids)} />)
    },
    style: {
      action: button('style', style, 'Проверить текст'),
      below: panel('style', style, 'Орфография и стиль', 'Замечаний нет', d => d.issues.length === 0,
        d => <PostStyleAssist issues={d.issues} content={data.content} onReplace={replaceContent} />)
    },
    route: {
      action: data.type === 'travel' ? button('route', route, 'Найти места в тексте') : undefined,
      below: data.type === 'travel' ? panel('route', route, 'Места из текста', 'Мест в тексте не нашлось', d => d.points.length === 0,
        d => <PostRouteAssist points={d.points} current={data.points} onAdd={addPoints} />) : undefined
    }
  };
}
