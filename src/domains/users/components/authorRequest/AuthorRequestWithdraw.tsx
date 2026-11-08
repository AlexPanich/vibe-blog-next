'use client'

import 'client-only';
import { withdrawAuthorRequestAction } from "@/domains/users/actions/authorRequestActions";
import { Button, Text } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

// «Отозвать» ожидающую заявку: строка удаляется, паузы нет — можно сразу подать новую.
export default function AuthorRequestWithdraw() {
  const action = useAction(withdrawAuthorRequestAction);
  const serverError = action.result.serverError?.message;

  return (
    <>
      { serverError && <Text c="red" size="sm">{ serverError }</Text> }
      <Button
        radius="xl"
        variant="default"
        leftSection={<IconArrowBackUp size={16} />}
        loading={action.isPending}
        onClick={() => action.execute()}
      >
        Отозвать заявку
      </Button>
    </>
  );
}
