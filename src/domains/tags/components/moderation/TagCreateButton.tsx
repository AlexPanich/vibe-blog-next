'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { createTagAction } from "@/domains/tags/actions/tagActions";
import { TagDto } from "@/domains/tags/dto/tagRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Group, Modal, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

/*
  «Новая рубрика» в шапке справочника: форма в окне. Обычно рубрики появляются здесь
  заранее — авторы выбирают из готовых
*/
export default function TagCreateButton() {
  const [ opened, setOpened ] = useState(false);
  const { nv, update, data } = useForm<TagDto>({ name: '' });
  const action = useAction(createTagAction, { onSuccess: () => close() });

  return (
    <>
      <Button variant="default" leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
        Новая рубрика
      </Button>

      <Modal opened={opened} onClose={close} title="Новая рубрика">
        <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
          <TextInput
            label="Название"
            description="Slug соберётся из названия и потом не меняется"
            data-autofocus
            {...nv('name')}
            onChange={e => update('name', e.target.value)}
            error={fieldError(action.result.validationErrors, 'name') ?? action.result.serverError?.message}
          />
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={close}>Отмена</Button>
            <Button type="submit" loading={action.isPending}>Добавить</Button>
          </Group>
        </form>
      </Modal>
    </>
  );

  function close(){
    setOpened(false);
    update('name', '');
    action.reset();
  }
}
