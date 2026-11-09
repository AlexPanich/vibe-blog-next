import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import type { DialogRowResource } from "@/domains/messages/dto/messageResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { IconArrowRight, IconMessagePlus } from "@tabler/icons-react";

/*
  Последние переписки на «Начале» (спека 42): собеседник, обрезок последнего сообщения,
  непрочитанное — жирным. Внизу «Написать сообщение» — в выбор собеседника (спека 50) — и,
  если переписки есть, «Все сообщения»
*/
export default function DialogDigest({ dialogs, unread }: { dialogs: DialogRowResource[], unread: number }) {
  return (
    <section className="ui-digest">
      <div className="ui-digest__head">
        <h2 className="ui-digest__title">Сообщения</h2>
        { unread > 0 && <span className="ui-desk__count">{ unread } { unread === 1 ? 'новое' : 'новых' }</span> }
      </div>

      { dialogs.length === 0 && <p className="ui-digest__empty">
        Переписок пока нет — <Link href="/office/messages/new">напишите первым</Link>.
      </p> }

      { dialogs.map(dialog => (
        <Link key={dialog.id} href={`/office/messages/${dialog.id}`} className="ui-digest__row">
          <UserAvatar name={dialog.peer.name} avatarKey={dialog.peer.avatarKey} size={40} />
          <span className="ui-digest__body">
            <span className="ui-digest__name">{ dialog.peer.name }</span>
            <span className="ui-digest__snippet" data-read={dialog.unread === 0}>
              { dialog.lastMessage ? `${dialog.lastMessage.mine ? 'Вы: ' : ''}${dialog.lastMessage.content}` : '—' }
            </span>
          </span>
          <span className="ui-digest__meta"><LocalDate value={dialog.lastMessageAt} relative /></span>
        </Link>
      )) }

      <div className="ui-digest__links">
        <Link href="/office/messages/new" className="ui-digest__more"><IconMessagePlus size={14} stroke={2} />Написать сообщение</Link>
        { dialogs.length > 0 && <Link href="/office/messages" className="ui-digest__more">Все сообщения<IconArrowRight size={14} stroke={2} /></Link> }
      </div>
    </section>
  );
}
