'use client'

import 'client-only';
import { imageUrl } from "@/core/imageUrl";
import { removeUserCoverAction } from "@/domains/users/actions/userAdminActions";
import { Button, TextInput } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type UserCoverRemoveFormProps = {
  id: number,
  coverKey: string
}

/*
  Удаление чужой обложки профиля администратором (спека 41) — как UserAvatarRemoveForm:
  превью, необязательная причина для журнала и контурная коралловая кнопка
*/
export default function UserCoverRemoveForm({ id, coverKey }: UserCoverRemoveFormProps) {
  const [ comment, setComment ] = useState('');
  const action = useAction(removeUserCoverAction.bind(null, id));
  const serverError = action.result.serverError?.message;

  return (
    <form className="ui-user-avatar" onSubmit={e => { e.preventDefault(); action.execute({ comment, expected: coverKey }) }}>
      <img className="ui-user-cover__preview" src={imageUrl(coverKey, 800)} alt="" />
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
        Удалить обложку
      </Button>
      { serverError && <p className="ui-user-card__error" role="alert">{ serverError }</p> }
    </form>
  );
}
