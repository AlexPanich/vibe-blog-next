'use client'

import 'client-only';
import type { PostTagResult } from "@/domains/posts/dto/postAssistResources";
import { TAGS_PER_POST } from "@/domains/tags/exports/tagRequests";
import { tagTone } from "@/domains/tags/exports/tagTone";
import { Button, Tooltip } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

type PostTagAssistProps = {
  tags: PostTagResult['tags'],
  value: number[],
  onChange: (ids: number[]) => void
}

/*
  Предложенные рубрики (спека 55, п. 12): чип добавляет id, уже выбранные исчезают — фильтр по
  текущему value. Поставить можно до TAGS_PER_POST (план 55, реш. 3): «Добавить все» берёт
  столько, сколько влезает
*/
export default function PostTagAssist({ tags, value, onChange }: PostTagAssistProps){
  const rest = tags.filter(tag => !value.includes(tag.id));
  const full = value.length >= TAGS_PER_POST;
  const limitHint = `Не больше ${TAGS_PER_POST} рубрик`;

  if(rest.length === 0){
    return <p className="ui-assist__state">Все предложенные рубрики уже выбраны</p>;
  }

  return (
    <div className="ui-assist__chips">
      { rest.map(tag => <button
        key={tag.id}
        type="button"
        className="ui-assist__chip"
        data-tone={tagTone(tag.id)}
        title={full ? limitHint : tag.reason}
        disabled={full}
        onClick={() => onChange([ ...value, tag.id ])}
      >
        <IconPlus size={13} stroke={2} aria-hidden /> { tag.name }
      </button>) }
      <Tooltip label={limitHint} disabled={!full} withArrow>
        <span>
          <Button
            type="button"
            variant="default"
            size="compact-sm"
            disabled={full}
            onClick={() => onChange([ ...value, ...rest.map(tag => tag.id) ].slice(0, TAGS_PER_POST))}
          >
            Добавить все
          </Button>
        </span>
      </Tooltip>
    </div>
  );
}
