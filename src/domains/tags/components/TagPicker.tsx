'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { TagListResource } from "@/domains/tags/dto/tagResources";
import { TAGS_PER_POST } from "@/domains/tags/dto/tagRequests";
import { Chip, Group, Input, Text } from "@mantine/core";

type TagPickerProps<T extends TagListResource> = {
  options: StrictResource<T, TagListResource>,
  value: number[],
  onChange: (value: number[]) => void,
  error?: string
}

// Выбор рубрик поста. При трёх выбранных остальные чипы неактивны, но не скрыты — список не прыгает.
export default function TagPicker<T extends TagListResource>({ options, value, onChange, error }: TagPickerProps<T>) {
  const full = value.length >= TAGS_PER_POST;

  return (
    <Input.Wrapper
      label="Рубрики"
      description={options.length > 0 ? `Выбрано ${value.length} из ${TAGS_PER_POST}` : undefined}
      error={error}
    >
      { options.length === 0 ? (
        <Text size="sm" c="dimmed" mt={4}>Рубрик пока нет — их заводит модерация.</Text>
      ) : (
        <Chip.Group multiple value={value.map(String)} onChange={ids => onChange(ids.map(Number))}>
          <Group gap="xs" mt={6}>
            { options.map(tag => {
              const selected = value.includes(tag.id);

              return <Chip key={tag.id} value={String(tag.id)} size="sm" disabled={full && !selected}>{ tag.name }</Chip>;
            }) }
          </Group>
        </Chip.Group>
      ) }
    </Input.Wrapper>
  );
}
