'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { updateBioAction } from "@/domains/users/actions/userAccountActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Alert, Button, Stack, Textarea, TextInput } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type UserBioFormProps = {
  name: string,
  bio: string
}

/*
  «Публичная страница»: имя и «О себе» — видно на странице автора. Имя пока только
  показывается: сменить его нельзя до спеки 45
*/
export default function UserBioForm({ name, bio }: UserBioFormProps) {
  const { nv, update, data } = useForm({ bio });
  const action = useAction(updateBioAction);

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Stack gap="md">
        <TextInput
          label="Имя"
          value={name}
          readOnly
          variant="filled"
          description="Задаётся при регистрации, сменить пока нельзя"
          inputWrapperOrder={[ 'label', 'input', 'description' ]}
        />
        <Textarea
          label={<span className="ui-account-count">О себе <small>{ data.bio.length } / 500</small></span>}
          labelProps={{ className: 'ui-account-count__label' }}
          autosize
          minRows={3}
          {...nv('bio')}
          onChange={e => update('bio', e.target.value)}
          error={fieldError(action.result.validationErrors, 'bio')}
        />
        { action.result.data?.done && <Alert color="green">Сохранено — видно на вашей странице автора.</Alert> }
        <div className="ui-account__save">
          <Button type="submit" radius="xl" loading={action.isPending} leftSection={<IconCheck size={16} />}>Сохранить</Button>
        </div>
      </Stack>
    </form>
  );
}
