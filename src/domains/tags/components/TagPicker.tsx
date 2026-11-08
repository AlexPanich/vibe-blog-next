'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { TagListResource } from "@/domains/tags/dto/tagResources";
import { TAGS_PER_POST } from "@/domains/tags/dto/tagRequests";
import { tagTone } from "@/domains/tags/shared/tagTone";
import { Input, Select, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";

type TagPickerProps<T extends TagListResource> = {
  options: StrictResource<T, TagListResource>,
  value: number[],
  onChange: (value: number[]) => void,
  error?: string
}

/*
  Рубрики поста — поле-чипы (спека 42): выбранные цветными пилюлями с крестиком, в конце
  поиск «Добавить рубрику…». После трёх поиск прячется — подпись «до 3» объясняет почему
*/
export default function TagPicker<T extends TagListResource>({ options, value, onChange, error }: TagPickerProps<T>) {
  const [ search, setSearch ] = useState('');
  const full = value.length >= TAGS_PER_POST;
  const selected = value.map(id => options.find(tag => tag.id === id)).filter(tag => tag !== undefined);
  const rest = options.filter(tag => !value.includes(tag.id)).map(tag => ({ value: String(tag.id), label: tag.name }));

  return (
    <Input.Wrapper
      label={<span className="ui-field__label">Рубрики <span className="ui-field__hint">до { TAGS_PER_POST }</span></span>}
      error={error}
    >
      { options.length === 0 ? (
        <Text size="sm" c="dimmed" mt={4}>Рубрик пока нет — их заводит модерация.</Text>
      ) : (
        <div className="ui-tag-field" data-error={!!error || undefined}>
          { selected.map(tag => (
            <span key={tag.id} className="ui-tag-field__chip" data-tone={tagTone(tag.id)}>
              { tag.name }
              <button
                type="button"
                aria-label={`Убрать рубрику ${tag.name}`}
                onClick={() => onChange(value.filter(id => id !== tag.id))}
              >
                <IconX size={13} stroke={2} />
              </button>
            </span>
          )) }
          { !full && <Select
            className="ui-tag-field__search"
            classNames={{ input: 'ui-tag-field__input', section: 'ui-tag-field__section' }}
            variant="unstyled"
            size="sm"
            aria-label="Добавить рубрику"
            placeholder="Добавить рубрику…"
            searchable
            data={rest}
            value={null}
            searchValue={search}
            onSearchChange={setSearch}
            nothingFoundMessage="Такой рубрики нет"
            onChange={id => { if(id){ onChange([ ...value, Number(id) ]); setSearch('') } }}
          /> }
        </div>
      ) }
    </Input.Wrapper>
  );
}
