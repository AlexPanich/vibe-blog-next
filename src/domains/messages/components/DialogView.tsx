'use client'

import 'client-only';
import LocalDate from "@/components/general/LocalDate";
import { StrictResource } from "@/core/resource";
import { deleteMessageAction, loadMessagesAction, readDialogAction } from "@/domains/messages/actions/messageActions";
import MessageComposer from "@/domains/messages/components/MessageComposer";
import MessagePeerControls from "@/domains/messages/components/MessagePeerControls";
import { messageItemResource, type DialogViewResource, type MessageItemResource } from "@/domains/messages/dto/messageResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import useLiveEvent from "@/hooks/useLiveEvent";
import { Anchor, Button, Group, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import Link from "@/components/general/Link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type DialogViewProps<T extends DialogViewResource> = {
  dialog: StrictResource<T, DialogViewResource>
}

/*
  Диалог: свои справа, чужие слева. Новые приходят по SSE; после переподключения догружаются
  сообщения новее последнего. Без id — новый диалог: его создаст первое сообщение
*/
export default function DialogView<T extends DialogViewResource>({ dialog }: DialogViewProps<T>) {
  const router = useRouter();
  const [ dialogId, setDialogId ] = useState(dialog.id);
  const [ items, setItems ] = useState<MessageItemResource[]>(dialog.messages);
  const [ hasMore, setHasMore ] = useState(dialog.hasMore);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

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
        <Link href="/office/messages" className="ui-backlink"><IconArrowLeft size={15} />Сообщения</Link>
        <div className="ui-dialog__peer">
          <Link href={`/authors/${dialog.peer.id}`} className="ui-follow-row">
            <UserAvatar name={dialog.peer.name} avatarKey={dialog.peer.avatarKey} size={36} />{ dialog.peer.name }
          </Link>
          <MessagePeerControls peerId={dialog.peer.id} ignored={dialog.ignored} restricted={dialog.restricted} />
        </div>
      </div>

      <div className="ui-dialog__list" ref={listRef}>
        { hasMore && <div className="ui-dialog__more">
          <Button variant="subtle" size="xs" loading={older.isPending} onClick={() => older.execute({ beforeId: items[0].id })}>
            Показать более ранние
          </Button>
        </div> }
        { items.length === 0 && <p className="ui-dialog__empty">Сообщений пока нет — напишите первым.</p> }
        { items.map(message => <MessageBubble
          key={message.id}
          message={message}
          mine={message.userId === dialog.meId}
          onDeleted={dialogDeleted => dialogDeleted ? router.replace('/office/messages') : setItems(prev => prev.filter(m => m.id !== message.id))}
        />) }
      </div>

      { dialog.blockReason
        ? <p className="ui-dialog__blocked">{ dialog.blockReason }</p>
        : <MessageComposer recipientId={dialog.peer.id} onSent={sent} /> }
    </section>
  );
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
          <LocalDate value={message.createdAt} />
          { mine && !confirming && <Anchor component="button" size="xs" c="dimmed" onClick={() => setConfirming(true)}>Удалить</Anchor> }
        </span>
        { confirming && <Group gap="xs" mt={4} justify="flex-end">
          <Text size="xs">Удалить у обоих?</Text>
          <Button size="compact-xs" color="red" loading={remove.isPending} onClick={() => remove.execute()}>Удалить</Button>
          <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setConfirming(false)}>Отмена</Button>
        </Group> }
        { remove.result.serverError && <Text size="xs" c="red">{ remove.result.serverError.message }</Text> }
      </div>
    </div>
  );
}
