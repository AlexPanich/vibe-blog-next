'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { TagRowResource } from "@/domains/tags/dto/tagResources";
import { deleteTagAction, renameTagAction } from "@/domains/tags/actions/tagActions";
import { fieldError } from "@/components/general/FieldError";
import { Button, Group, Modal, Text, TextInput } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type TagRowProps<T extends TagRowResource> = {
  tag: StrictResource<T, TagRowResource>
}

// Строка справочника: переименование прямо в строке, удаление с подтверждением.
export default function TagRow<T extends TagRowResource>({ tag }: TagRowProps<T>) {
  const [ editing, setEditing ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);
  const [ name, setName ] = useState(tag.name);
  const rename = useAction(renameTagAction.bind(null, tag.id), { onSuccess: () => setEditing(false) });
  const remove = useAction(deleteTagAction.bind(null, tag.id), { onSuccess: () => setConfirming(false) });

  return (
    <div className="ui-row">
      <div className="ui-row__body">
        { editing ? (
          <form onSubmit={e => { e.preventDefault(); rename.execute({ name }) }}>
            <Group align="flex-start">
              <TextInput
                aria-label="Новое название"
                value={name}
                onChange={e => setName(e.target.value)}
                error={fieldError(rename.result.validationErrors, 'name') ?? rename.result.serverError?.message}
                style={{ flex: 1 }}
              />
              <Button type="submit" loading={rename.isPending}>Сохранить</Button>
              <Button variant="default" onClick={() => { setEditing(false); setName(tag.name); rename.reset() }}>Отмена</Button>
            </Group>
          </form>
        ) : <h3 className="ui-row__title">{ tag.name }</h3> }
        <div className="ui-meta">
          <span>/{ tag.slug }</span>
          <span>Постов: { tag.postsCount }</span>
        </div>
      </div>
      { !editing && <div className="ui-row__aside">
        <Group gap="xs">
          <Button size="compact-sm" variant="default" leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
            Переименовать
          </Button>
          <Button size="compact-sm" variant="light" color="red" leftSection={<IconTrash size={14} />} onClick={() => setConfirming(true)}>
            Удалить
          </Button>
        </Group>
      </div> }

      <Modal opened={confirming} onClose={() => setConfirming(false)} title={`Удалить рубрику «${tag.name}»?`}>
        <Text size="sm">
          { tag.postsCount > 0 ? `Рубрика снимется с постов: ${tag.postsCount}. Посты останутся.` : 'Постов с этой рубрикой нет.' }
        </Text>
        { remove.result.serverError && <Text c="red" size="sm" mt="sm">{ remove.result.serverError.message }</Text> }
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirming(false)}>Отмена</Button>
          <Button color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить</Button>
        </Group>
      </Modal>
    </div>
  );
}
