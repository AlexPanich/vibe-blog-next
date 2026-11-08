'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { plural } from "@/core/plural";
import type { TagModerationRowResource } from "@/domains/tags/dto/tagModerationResources";
import { deleteTagAction, renameTagAction } from "@/domains/tags/actions/tagActions";
import TagFollowChip from "@/domains/tags/components/follows/TagFollowChip";
import { fieldError } from "@/components/general/FieldError";
import { Button, Group, Menu, MenuDropdown, MenuItem, MenuTarget, Modal, Text, TextInput } from "@mantine/core";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type TagTableRowProps<T extends TagModerationRowResource> = {
  tag: StrictResource<T, TagModerationRowResource>
}

/*
  Строка справочника рубрик (спека 42, шаг 16): чип, slug, постов, подписчиков и действия.
  Переименование — в ячейке названия, удаление — с подтверждением. На телефоне цифры
  уходят строкой под чип, действия — в «…»
*/
export default function TagTableRow<T extends TagModerationRowResource>({ tag }: TagTableRowProps<T>) {
  const [ editing, setEditing ] = useState(false);
  const [ confirming, setConfirming ] = useState(false);
  const [ name, setName ] = useState(tag.name);
  const rename = useAction(renameTagAction.bind(null, tag.id), { onSuccess: () => setEditing(false) });
  const remove = useAction(deleteTagAction.bind(null, tag.id), { onSuccess: () => setConfirming(false) });

  return (
    <div className="ui-tag-table__row" role="row" data-editing={editing || undefined}>
      <div className="ui-tag-table__name" role="cell">
        { editing ? (
          <form onSubmit={e => { e.preventDefault(); rename.execute({ name }) }} className="ui-tag-table__rename">
            <TextInput
              size="sm"
              aria-label="Новое название"
              value={name}
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && cancel()}
              error={fieldError(rename.result.validationErrors, 'name') ?? rename.result.serverError?.message}
              style={{ flex: 1 }}
            />
            <Group gap="xs" wrap="nowrap">
              <Button size="sm" type="submit" loading={rename.isPending}>Сохранить</Button>
              <Button size="sm" variant="default" onClick={cancel}>Отмена</Button>
            </Group>
          </form>
        ) : (
          <>
            <TagFollowChip tag={tag} />
            <span className="ui-tag-table__mobile-meta">
              { tag.postsCount } { plural(tag.postsCount, [ 'пост', 'поста', 'постов' ]) } · { tag.followersCount } { plural(tag.followersCount, [ 'подписчик', 'подписчика', 'подписчиков' ]) }
            </span>
          </>
        ) }
      </div>
      <span className="ui-tag-table__slug" role="cell">/{ tag.slug }</span>
      <span className="ui-tag-table__num" role="cell">{ tag.postsCount }</span>
      <span className="ui-tag-table__num" role="cell">{ tag.followersCount }</span>
      <div className="ui-tag-table__acts" role="cell">
        { !editing && <>
          <button type="button" className="ui-tag-table__act" onClick={() => setEditing(true)} aria-label={`Переименовать «${tag.name}»`} title="Переименовать">
            <IconPencil size={14} stroke={1.8} />
          </button>
          <button type="button" className="ui-tag-table__act ui-tag-table__act--danger" onClick={() => setConfirming(true)} aria-label={`Удалить «${tag.name}»`} title="Удалить">
            <IconTrash size={14} stroke={1.8} />
          </button>
          <Menu position="bottom-end" withinPortal>
            <MenuTarget>
              <button type="button" className="ui-tag-table__more" aria-label={`Действия с «${tag.name}»`}>
                <IconDots size={18} stroke={1.8} />
              </button>
            </MenuTarget>
            <MenuDropdown>
              <MenuItem leftSection={<IconPencil size={16} stroke={1.8} />} onClick={() => setEditing(true)}>
                Переименовать
              </MenuItem>
              <MenuItem color="red" leftSection={<IconTrash size={16} stroke={1.8} />} onClick={() => setConfirming(true)}>
                Удалить
              </MenuItem>
            </MenuDropdown>
          </Menu>
        </> }
      </div>

      <Modal opened={confirming} onClose={() => setConfirming(false)} title={`Удалить рубрику «${tag.name}»?`}>
        <Text size="sm">
          { tag.postsCount > 0 ? `Рубрика снимется с постов: ${tag.postsCount}. Посты останутся.` : 'Постов с этой рубрикой нет.' }
          { tag.followersCount > 0 && ` Подписки на неё (${tag.followersCount}) удалятся.` }
        </Text>
        { remove.result.serverError && <Text c="red" size="sm" mt="sm">{ remove.result.serverError.message }</Text> }
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirming(false)}>Отмена</Button>
          <Button color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить</Button>
        </Group>
      </Modal>
    </div>
  );

  function cancel(){
    setEditing(false);
    setName(tag.name);
    rename.reset();
  }
}
