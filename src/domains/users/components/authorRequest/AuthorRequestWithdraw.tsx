'use client'

import 'client-only';
import { withdrawAuthorRequestAction } from "@/domains/users/actions/authorRequestActions";
import { Button, Group, Text } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

// «Отозвать» ожидающую заявку: строка удаляется, паузы нет — можно сразу подать новую.
export default function AuthorRequestWithdraw() {
  const action = useAction(withdrawAuthorRequestAction);
  const serverError = action.result.serverError?.message;

  return (
    <Group gap="sm">
      <Button
        size="compact-sm"
        variant="default"
        leftSection={<IconArrowBackUp size={14} />}
        loading={action.isPending}
        onClick={() => action.execute()}
      >
        Отозвать
      </Button>
      { serverError && <Text c="red" size="sm">{ serverError }</Text> }
    </Group>
  );
}
