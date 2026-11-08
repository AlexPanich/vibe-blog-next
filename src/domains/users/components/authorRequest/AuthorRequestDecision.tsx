'use client'

import 'client-only';
import { fieldError } from "@/components/general/FieldError";
import { approveAuthorRequestAction, rejectAuthorRequestAction } from "@/domains/users/actions/authorRequestAdminActions";
import { Button, TextInput } from "@mantine/core";
import { IconUserCheck, IconX } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";

/*
  Решение по заявке: причина нужна только для отказа (её проверяет action), «Выдать роль
  автора» поле не читает. Enter в поле — отказ: поле только для него
*/
export default function AuthorRequestDecision({ id }: { id: number }) {
  const router = useRouter();
  const [ reason, setReason ] = useState('');
  const approve = useAction(approveAuthorRequestAction.bind(null, id), { onSuccess: () => router.refresh() });
  const reject = useAction(rejectAuthorRequestAction.bind(null, id), { onSuccess: () => router.refresh() });
  const pending = approve.isPending || reject.isPending;
  const error = approve.result.serverError ?? reject.result.serverError;

  return (
    <form className="ui-request-review__form" onSubmit={e => { e.preventDefault(); approve.reset(); reject.execute({ reason }) }}>
      <TextInput
        label="Причина отказа"
        placeholder="Её увидит пользователь"
        value={reason}
        onChange={e => setReason(e.target.value)}
        error={fieldError(reject.result.validationErrors, 'reason')}
        maxLength={500}
      />
      <div className="ui-request-review__buttons">
        <Button
          type="submit"
          variant="outline"
          className="ui-request-review__reject"
          leftSection={<IconX size={16} stroke={2} />}
          loading={reject.isPending}
          disabled={pending && !reject.isPending}
        >
          Отклонить
        </Button>
        <Button
          color="mint"
          leftSection={<IconUserCheck size={16} stroke={2} />}
          loading={approve.isPending}
          disabled={pending && !approve.isPending}
          onClick={() => { reject.reset(); approve.execute() }}
        >
          Выдать роль<span className="ui-request-review__long">&nbsp;автора</span>
        </Button>
      </div>
      { error && <p className="ui-request-review__error" role="alert">{ error.message }</p> }
    </form>
  );
}
