'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { createTagAction } from "@/domains/tags/actions/tagActions";
import { TagDto } from "@/domains/tags/dto/tagRequests";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Button, Group, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

export default function TagCreateForm() {
  const { nv, update, data } = useForm<TagDto>({ name: '' });
  const action = useAction(createTagAction, { onSuccess: () => update('name', '') });

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Group align="flex-start">
        <TextInput
          placeholder="Название рубрики"
          aria-label="Название рубрики"
          style={{ flex: 1 }}
          {...nv('name')}
          onChange={e => update('name', e.target.value)}
          error={fieldError(action.result.validationErrors, 'name') ?? action.result.serverError?.message}
        />
        <Button type="submit" loading={action.isPending} leftSection={<IconPlus size={16} />}>
          Добавить
        </Button>
      </Group>
    </form>
  );
}
