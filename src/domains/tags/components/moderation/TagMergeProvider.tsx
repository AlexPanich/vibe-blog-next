'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import type { TagRowListResource } from "@/domains/tags/dto/tagResources";
import type { TagModerationRowResource } from "@/domains/tags/dto/tagModerationResources";
import TagMergeDialog from "@/domains/tags/components/moderation/TagMergeDialog";
import { createContext, useContext, useState, type ReactNode } from "react";

type TagMergeProviderProps<T extends TagRowListResource> = {
  targets: StrictResource<T, TagRowListResource>,
  children: ReactNode
}

/*
  Слияние рубрик (спека 47): один диалог на весь справочник. Список целей нужен каждой
  строке — он здесь, а строка только зовёт open(). Исходная строка после слияния исчезает
  из таблицы, поэтому состояние живёт выше строк
*/
export default function TagMergeProvider<T extends TagRowListResource>({ targets, children }: TagMergeProviderProps<T>) {
  const [ state, setState ] = useState<MergeState | null>(null);

  return (
    <TagMergeContext.Provider value={{ open: (source, targetId) => setState({ source, targetId: targetId ?? null }) }}>
      { children }
      { state && <TagMergeDialog
        key={state.source.id}
        source={state.source}
        initialTargetId={state.targetId}
        targets={targets}
        onClose={() => setState(null)}
      /> }
    </TagMergeContext.Provider>
  );
}

export function useTagMerge(){
  const value = useContext(TagMergeContext);

  if(!value){
    throw new Error('useTagMerge — только внутри TagMergeProvider');
  }

  return value;
}

type MergeSource = Pick<TagModerationRowResource, 'id' | 'name' | 'postsCount' | 'followersCount'>;

type MergeState = { source: MergeSource, targetId: number | null };

type TagMergeContextValue = { open: (source: MergeSource, targetId?: number) => void };

const TagMergeContext = createContext<TagMergeContextValue | null>(null);
