'use client'

import 'client-only';
import { plural } from "@/core/plural";
import type { TagModerationRowResource } from "@/domains/tags/dto/tagModerationResources";
import type { TagRowListResource } from "@/domains/tags/dto/tagResources";
import { mergeTagAction } from "@/domains/tags/actions/tagActions";
import { fieldError } from "@/components/general/FieldError";
import { showToast } from "@/components/general/showToast";
import { Button, Group, Modal, Select, Text } from "@mantine/core";
import { IconArrowMerge } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type TagMergeDialogProps = {
  source: Pick<TagModerationRowResource, 'id' | 'name' | 'postsCount' | 'followersCount'>,
  initialTargetId: number | null,
  targets: TagRowListResource,
  onClose: () => void
}

/*
  Диалог слияния (спека 47, UI): выбор целевой рубрики с поиском и итог «что перейдёт».
  Итог — по счётчикам исходной, пересечения с целевой не вычитаются: это подсказка
*/
export default function TagMergeDialog({ source, initialTargetId, targets, onClose }: TagMergeDialogProps) {
  const [ targetId, setTargetId ] = useState(initialTargetId);
  const action = useAction(mergeTagAction.bind(null, source.id), {
    onSuccess: ({ data }) => {
      onClose();
      showToast({
        id: `tag-merge-${source.id}`,
        icon: <IconArrowMerge size={18} stroke={1.8} />,
        title: 'Рубрики слиты',
        text: `Рубрика «${data.source}» слита с «${data.target}»`,
        href: null
      });
    }
  });
  const options = targets.filter(tag => tag.id !== source.id).sort((a, b) => b.postsCount - a.postsCount);
  const counts = new Map(options.map(tag => [ String(tag.id), tag.postsCount ]));
  const target = options.find(tag => tag.id === targetId);

  return (
    <Modal opened onClose={onClose} title={`Слить «${source.name}»`}>
      <form onSubmit={e => { e.preventDefault(); if(targetId){ action.execute({ targetId }) } }}>
        <Select
          label="Целевая рубрика"
          placeholder="Найти рубрику"
          searchable
          data-autofocus={initialTargetId === null || undefined}
          data={options.map(tag => ({ value: String(tag.id), label: tag.name }))}
          value={targetId ? String(targetId) : null}
          onChange={id => setTargetId(id ? Number(id) : null)}
          nothingFoundMessage="Рубрика не найдена"
          renderOption={({ option }) => (
            <Group justify="space-between" wrap="nowrap" style={{ flex: 1 }}>
              <span>{ option.label }</span>
              <Text size="xs" c="dimmed">{ postsLabel(counts.get(option.value) ?? 0) }</Text>
            </Group>
          )}
          error={fieldError(action.result.validationErrors, 'targetId') ?? action.result.serverError?.message}
        />
        { target && <Text size="sm" mt="md">
          { summary(source, target.name) } Рубрика «{ source.name }» будет удалена, её адрес будет
          вести на «{ target.name }».
        </Text> }
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={!target} loading={action.isPending}>Слить</Button>
        </Group>
      </form>
    </Modal>
  );
}

function summary({ postsCount, followersCount }: TagMergeDialogProps['source'], target: string){
  if(postsCount === 0 && followersCount === 0){
    return 'Постов и подписчиков у рубрики нет.';
  }

  const followers = `${followersCount} ${plural(followersCount, [ 'подписчик', 'подписчика', 'подписчиков' ])}`;

  return `${postsLabel(postsCount)} и ${followers} перейдут в «${target}».`;
}

function postsLabel(n: number){
  return `${n} ${plural(n, [ 'пост', 'поста', 'постов' ])}`;
}
