'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import { USER_ROLES } from "@/database/schema";
import { UserRolesFormResource } from "@/domains/users/dto/userResources";
import { updateUserRolesAction } from "@/domains/users/actions/userAdminActions";
import useForm from "@/hooks/useForm";
import { Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type UserRolesFormProps<T extends UserRolesFormResource> = {
  user: StrictResource<T, UserRolesFormResource>
}

// Роли пользователя галочками. expected — роли на момент открытия страницы, по ним сервер
// узнаёт, что другой admin успел их поменять.
export default function UserRolesForm<T extends UserRolesFormResource>({ user }: UserRolesFormProps<T>) {
  const action = useAction(updateUserRolesAction.bind(null, user.id));
  const form = useForm({ roles: user.roles });
  const serverError = action.result.serverError?.message;

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute({ roles: form.data.roles, expected: user.roles }) }}>
      <Stack>
        <Checkbox.Group
          value={form.data.roles}
          onChange={value => form.update('roles', USER_ROLES.filter(role => value.includes(role)))}
        >
          <Group>
            { USER_ROLES.map(role => <Checkbox key={role} value={role} label={role} />) }
          </Group>
        </Checkbox.Group>
        { serverError && <Text c="red" size="sm">{ serverError }</Text> }
        <div>
          <Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={action.isPending}>
            Сохранить роли
          </Button>
        </div>
      </Stack>
    </form>
  );
}
