'use client'

import 'client-only';
import { removeUserAvatarAction } from "@/domains/users/actions/userAdminActions";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type UserAvatarRemoveFormProps = {
  id: number,
  name: string,
  avatarKey: string
}

// Удаление чужого аватара администратором; причина необязательна, действие уходит в журнал.
export default function UserAvatarRemoveForm({ id, name, avatarKey }: UserAvatarRemoveFormProps) {
  const [ comment, setComment ] = useState('');
  const action = useAction(removeUserAvatarAction.bind(null, id));

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute({ comment, expected: avatarKey }) }}>
      <Stack gap="sm">
        <Group gap="md" align="flex-end">
          <UserAvatar name={name} avatarKey={avatarKey} size={72} />
          <TextInput label="Причина удаления" description="Необязательно, попадёт в журнал" value={comment} onChange={e => setComment(e.target.value)} style={{ flex: 1 }} />
        </Group>
        { action.result.serverError && <Text c="red" size="sm">{ action.result.serverError.message }</Text> }
        <div>
          <Button type="submit" color="red" variant="light" loading={action.isPending}>Удалить аватар</Button>
        </div>
      </Stack>
    </form>
  );
}
