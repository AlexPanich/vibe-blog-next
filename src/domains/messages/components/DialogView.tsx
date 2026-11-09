'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { plural } from "@/core/plural";
import { StrictResource } from "@/core/resource";
import { deleteMessageAction, loadMessagesAction, readDialogAction } from "@/domains/messages/actions/messageActions";
import MessageComposer from "@/domains/messages/components/MessageComposer";
import MessagePeerMenu from "@/domains/messages/components/MessagePeerMenu";
import { messageItemResource, type DialogPeerResource, type DialogViewResource, type MessageItemResource } from "@/domains/messages/dto/messageResources";
import { dayLabel, sameDay } from "@/domains/messages/shared/messageDates";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import useHydrated from "@/hooks/useHydrated";
import useLiveEvent from "@/hooks/useLiveEvent";
import { Anchor, Button, Group, Text } from "@mantine/core";
import { IconChevronLeft, IconUser } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";

type DialogViewProps<T extends DialogViewResource> = {
  dialog: StrictResource<T, DialogViewResource>
}

/*
  Диалог — правая колонка «Сообщений»: свои справа, чужие слева, между днями — разделитель
  (после гидрации: день считается по часам браузера). Новые приходят по SSE; после
  переподключения догружаются сообщения новее последнего. Без id — новый диалог: его создаст
  первое сообщение
*/
export default function DialogView<T extends DialogViewResource>({ dialog }: DialogViewProps<T>) {
  const router = useRouter();
  const [ dialogId, setDialogId ] = useState(dialog.id);
  const [ items, setItems ] = useState<MessageItemResource[]>(dialog.messages);
  const [ hasMore, setHasMore ] = useState(dialog.hasMore);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const hydrated = useHydrated();

  const read = useAction(readDialogAction.bind(null, dialogId ?? 0));
  const older = useAction(loadMessagesAction.bind(null, dialogId ?? 0), {
    onSuccess: ({ data, input }) => {
      if(input.afterId !== undefined){
        append(data.items);
      }
      else{
        stickToBottom.current = false;
        setItems(prev => [ ...data.items, ...prev ]);
        setHasMore(data.hasMore);
      }
    }
  });

  // execute меняется на каждом рендере — эффект берёт его из ref
  const markRead = useRef(read.execute);
  const readFor = useRef<number | null>(null);

  useEffect(() => {
    markRead.current = read.execute;
  });

  useEffect(() => {
    if(dialogId !== null && readFor.current !== dialogId){
      readFor.current = dialogId;
      markRead.current();
    }
  }, [ dialogId ]);

  useEffect(() => {
    const list = listRef.current;

    if(list && stickToBottom.current){
      list.scrollTop = list.scrollHeight;
    }
  }, [ items ]);

  useLiveEvent('message.created', data => {
    if(data.dialogId !== dialogId){
      return;
    }

    append([ messageItemResource.parse(data.message) ]);

    if(data.message.userId !== dialog.meId){
      read.execute();
    }
  });

  useLiveEvent('message.deleted', data => {
    if(data.dialogId !== dialogId){
      return;
    }

    if(data.dialogDeleted){
      router.replace('/office/messages');
      return;
    }

    setItems(prev => prev.filter(m => m.id !== data.messageId));
  });

  // Событие, пришедшее в разрыв, потеряно — догружаем новее последнего
  useLiveEvent('open', () => {
    if(dialogId !== null && items.length > 0){
      older.execute({ afterId: items[items.length - 1].id });
    }
  });

  function append(added: MessageItemResource[]){
    stickToBottom.current = true;
    setItems(prev => [ ...prev, ...added.filter(m => !prev.some(p => p.id === m.id)) ]);
  }

  function sent({ dialogId: id, message }: { dialogId: number, message: MessageItemResource }){
    if(dialogId === null){
      setDialogId(id);
      readFor.current = id;
      router.replace(`/office/messages/${id}`);
    }

    append([ message ]);
  }

  return (
    <section className="ui-dialog">
      <div className="ui-dialog__head">
        <Link href="/office/messages" className="ui-dialog__back" aria-label="К сообщениям"><IconChevronLeft size={22} stroke={2} /></Link>
        <Link href={`/authors/${dialog.peer.id}`} className="ui-dialog__peer">
          <UserAvatar name={dialog.peer.name} avatarKey={dialog.peer.avatarKey} size={40} />
          <span className="ui-dialog__who">
            <span className="ui-dialog__name">{ dialog.peer.name }</span>
            <span className="ui-dialog__sub">{ peerLine(dialog.peer) }</span>
          </span>
        </Link>
        <Link href={`/authors/${dialog.peer.id}`} className="ui-dialog__icon ui-dialog__icon--profile" aria-label="Страница автора" title="Страница автора">
          <IconUser size={17} stroke={1.8} />
        </Link>
        <MessagePeerMenu peerId={dialog.peer.id} ignored={dialog.ignored} restricted={dialog.restricted} />
      </div>

      <div className="ui-dialog__list" ref={listRef}>
        { hasMore && <div className="ui-dialog__more">
          <Button variant="subtle" size="xs" loading={older.isPending} onClick={() => older.execute({ beforeId: items[0].id })}>
            Показать более ранние
          </Button>
        </div> }
        { items.length === 0 && <p className="ui-dialog__empty">Сообщений пока нет — напишите первым.</p> }
        { items.map((message, i) => <Fragment key={message.id}>
          { hydrated && (i === 0 || !sameDay(items[i - 1].createdAt, message.createdAt)) && <p className="ui-dialog__day">{ dayLabel(message.createdAt) }</p> }
          <MessageBubble
            message={message}
            mine={message.userId === dialog.meId}
            onDeleted={dialogDeleted => dialogDeleted ? router.replace('/office/messages') : setItems(prev => prev.filter(m => m.id !== message.id))}
          />
        </Fragment>) }
      </div>

      { dialog.blockReason
        ? <p className="ui-dialog__blocked">{ dialog.blockReason }</p>
        : <MessageComposer recipientId={dialog.peer.id} onSent={sent} /> }
    </section>
  );
}

// «Автор · 14 постов» под именем; не автор — «Читатель»
function peerLine(peer: DialogPeerResource): string {
  if(!peer.author){
    return 'Читатель';
  }

  if(peer.posts === 0){
    return 'Автор';
  }

  // Падежа у рубрики нет («о походах» не собрать) — хештегом, как в AuthorTopics (спека 49)
  return `Автор · ${peer.posts} ${plural(peer.posts, [ 'пост', 'поста', 'постов' ])}${peer.topic ? ` · #${peer.topic}` : ''}`;
}

type MessageBubbleProps = {
  message: MessageItemResource,
  mine: boolean,
  onDeleted: (dialogDeleted: boolean) => void
}

function MessageBubble({ message, mine, onDeleted }: MessageBubbleProps) {
  const [ confirming, setConfirming ] = useState(false);
  const remove = useAction(deleteMessageAction.bind(null, message.id), { onSuccess: ({ data }) => onDeleted(data.dialogDeleted) });

  return (
    <div className={`ui-message${mine ? ' ui-message--mine' : ''}`}>
      <div className="ui-message__bubble">
        <p className="ui-message__text">{ message.content }</p>
        <span className="ui-message__meta">
          { mine && !confirming && <Anchor component="button" className="ui-message__delete" onClick={() => setConfirming(true)}>Удалить</Anchor> }
          <LocalDate value={message.createdAt} options={{ timeStyle: 'short' }} />
        </span>
        { confirming && <Group gap="xs" mt={4} justify="flex-end">
          <Text size="xs">Удалить у обоих?</Text>
          <Button size="compact-xs" color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить</Button>
          <Button size="compact-xs" variant={mine ? 'white' : 'subtle'} color="gray" onClick={() => setConfirming(false)}>Отмена</Button>
        </Group> }
        { remove.result.serverError && <Text size="xs" c="red">{ remove.result.serverError.message }</Text> }
      </div>
    </div>
  );
}
