'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { updateBioAction } from "@/domains/users/actions/userAccountActions";
import { fieldError } from "@/components/general/FieldError";
import useForm from "@/hooks/useForm";
import { Alert, Button, Stack, Textarea } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";

// «О себе» — видно на странице автора.
export default function UserBioForm({ bio }: { bio: string }) {
  const { nv, update, data } = useForm({ bio });
  const action = useAction(updateBioAction);

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(data) }}>
      <Stack>
        { action.result.data?.done && <Alert color="green">Сохранено — видно на вашей странице автора.</Alert> }
        <Textarea
          label="О себе"
          description={`${data.bio.length} / 500`}
          autosize
          minRows={3}
          {...nv('bio')}
          onChange={e => update('bio', e.target.value)}
          error={fieldError(action.result.validationErrors, 'bio')}
        />
        <div>
          <Button type="submit" loading={action.isPending} leftSection={<IconDeviceFloppy size={16} />}>Сохранить</Button>
        </div>
      </Stack>
    </form>
  );
}
