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
  bio: string,
  nameGenitive: string
}

/*
  «Публичная страница»: имя и «О себе» — видно на странице автора. Имя пока только
  показывается: сменить его нельзя до спеки 45. Имя в родительном падеже для «Ещё у …» под
  постом (спека 41) человек пишет сам — склонять не пытаемся
*/
export default function UserBioForm({ name, bio, nameGenitive }: UserBioFormProps) {
  const { nv, update, data } = useForm({ bio, nameGenitive });
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
        <TextInput
          label="Как вас называть в подписях: «Ещё у …»"
          placeholder="Ани, Марата Хасанова"
          description="Под вашими постами: «Ещё у Ани». Пусто — «Ещё у автора»"
          maxLength={40}
          inputWrapperOrder={[ 'label', 'input', 'description', 'error' ]}
          {...nv('nameGenitive')}
          onChange={e => update('nameGenitive', e.target.value)}
          error={fieldError(action.result.validationErrors, 'nameGenitive')}
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
