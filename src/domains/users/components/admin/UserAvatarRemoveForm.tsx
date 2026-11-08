'use client'

import 'client-only';
import { removeUserAvatarAction } from "@/domains/users/actions/userAdminActions";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { Button, TextInput } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type UserAvatarRemoveFormProps = {
  id: number,
  name: string,
  avatarKey: string
}

/*
  Удаление чужого аватара администратором (спека 42, шаг 19): аватар, причина (необязательна,
  в макете её нет — оставлена ради журнала, строкой ниже) и контурная коралловая кнопка
*/
export default function UserAvatarRemoveForm({ id, name, avatarKey }: UserAvatarRemoveFormProps) {
  const [ comment, setComment ] = useState('');
  const action = useAction(removeUserAvatarAction.bind(null, id));
  const serverError = action.result.serverError?.message;

  return (
    <form className="ui-user-avatar" onSubmit={e => { e.preventDefault(); action.execute({ comment, expected: avatarKey }) }}>
      <UserAvatar name={name} avatarKey={avatarKey} size={56} />
      <TextInput
        className="ui-user-avatar__reason"
        aria-label="Причина удаления"
        placeholder="Причина — необязательно, попадёт в журнал"
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      <Button
        type="submit"
        variant="outline"
        className="ui-user-avatar__remove"
        leftSection={<IconTrash size={15} stroke={2} />}
        loading={action.isPending}
      >
        Удалить аватар
      </Button>
      { serverError && <p className="ui-user-card__error" role="alert">{ serverError }</p> }
    </form>
  );
}
