'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { fieldError } from "@/components/general/FieldError";
import { StrictResource } from "@/core/resource";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { approveAuthorRequestAction, rejectAuthorRequestAction } from "@/domains/users/actions/authorRequestAdminActions";
import type { AuthorRequestRowResource } from "@/domains/users/dto/userResources";
import { AUTHOR_REQUEST_PAUSE_DAYS } from "@/domains/users/dto/authorRequestRequests";
import { Button, Group, Text, TextInput } from "@mantine/core";
import { IconCalendar, IconCheck, IconMessage, IconX } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthorRequestRowProps<T extends AuthorRequestRowResource> = {
  row: StrictResource<T, AuthorRequestRowResource>,
  // Своя заявка — без кнопок: свои роли admin не меняет
  own: boolean
}

// Строка заявки на роль автора: у ожидающей — «Одобрить» и «Отклонить» с причиной.
export default function AuthorRequestRow<T extends AuthorRequestRowResource>({ row, own }: AuthorRequestRowProps<T>) {
  const router = useRouter();
  const [ rejecting, setRejecting ] = useState(false);
  const [ reason, setReason ] = useState('');
  const approve = useAction(approveAuthorRequestAction.bind(null, row.id), { onSuccess: () => router.refresh() });
  const reject = useAction(rejectAuthorRequestAction.bind(null, row.id), { onSuccess: () => router.refresh() });
  const error = approve.result.serverError ?? reject.result.serverError;

  return (
    <div className="ui-row ui-row--static">
      <div className="ui-row__body">
        <div className="ui-meta">
          <Link href={`/office/admin/users/${row.user.id}`} className="ui-meta__item">
            <UserAvatar name={row.user.name} avatarKey={row.user.avatarKey} size={24} />{ row.user.name }
          </Link>
          { row.user.banned && <span className="ui-status" data-status="banned">Заблокирован</span> }
          <span className="ui-meta__item">
            <IconCalendar size={13} stroke={1.8} />с <LocalDate value={row.user.createdAt} options={{ dateStyle: 'medium' }} />
          </span>
          <span className="ui-meta__item">
            <IconMessage size={13} stroke={1.8} />Комментариев: { row.user.commentsCount }
          </span>
        </div>

        <p className="ui-comment__text">{ row.text }</p>

        { row.status !== 'pending'
          ? <Decision row={row} />
          : own
            ? <Text size="sm" c="dimmed">Ваша заявка — решит другой администратор.</Text>
            : rejecting
              ? <form className="ui-comment-form" onSubmit={e => { e.preventDefault(); reject.execute({ reason }) }}>
                <TextInput
                  label="Причина отказа"
                  description={`Её увидит заявитель. Новую заявку можно будет подать через ${AUTHOR_REQUEST_PAUSE_DAYS} дней`}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  error={fieldError(reject.result.validationErrors, 'reason')}
                  autoFocus
                />
                <Group gap="xs">
                  <Button type="submit" size="compact-sm" color="red" loading={reject.isPending}>Отклонить</Button>
                  <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setRejecting(false)}>Отмена</Button>
                </Group>
              </form>
              : <Group gap="xs">
                <Button size="compact-sm" leftSection={<IconCheck size={14} />} loading={approve.isPending} onClick={() => approve.execute()}>
                  Одобрить
                </Button>
                <Button size="compact-sm" color="red" variant="light" leftSection={<IconX size={14} />} onClick={() => setRejecting(true)}>
                  Отклонить
                </Button>
              </Group> }

        { error && <Text size="sm" c="red">{ error.message }</Text> }
      </div>
      <div className="ui-row__aside">
        <span className="ui-meta">
          <LocalDate value={row.createdAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
        </span>
      </div>
    </div>
  );
}

function Decision({ row }: { row: AuthorRequestRowResource }){
  const approved = row.status === 'approved';

  return (
    <div className={approved ? 'ui-note' : 'ui-note ui-note--danger'}>
      <span className="ui-note__label">
        { approved ? 'Одобрена' : 'Отклонена' }
        { row.deciderName && ` · ${row.deciderName}` }
        { row.decidedAt && <> · <LocalDate value={row.decidedAt} options={{ dateStyle: 'medium' }} /></> }
      </span>
      { row.reason }
    </div>
  );
}
