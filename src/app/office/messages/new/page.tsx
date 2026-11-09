import { db } from "@/globals/db";
import { resource } from "@/core/resource";
import DialogView from "@/domains/messages/components/DialogView";
import MessagePicker from "@/domains/messages/components/MessagePicker";
import { messagePickerDto } from "@/domains/messages/dto/messageRequests";
import { dialogViewResource, messagePickerRowResource } from "@/domains/messages/dto/messageResources";
import { findDialogBetween } from "@/domains/messages/shared/messageAccess";
import { loadDialogView } from "@/domains/messages/shared/loadMessages";
import { loadMessagePicker } from "@/domains/messages/shared/loadMessagePicker";
import { requireAuthUser } from "@/shared/auth";
import { idOrFail } from "@/shared/params";
import { notFound, redirect } from "next/navigation";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Новое сообщение' };

/*
  Без to — выбор собеседника (спека 50): поиск по имени из ?q= (staff — по всем), без запроса —
  подписки.
  С to («Написать» со страницы автора или строка выбора): диалог уже есть — сразу туда, иначе
  шапка собеседника и поле ввода; диалог создаст первое сообщение. to главнее q, кривой to — 404
*/
export default async function OfficeNewMessage({ searchParams }: PageProps<'/office/messages/new'>) {
  const user = await requireAuthUser();
  const { to, q } = await searchParams;

  if(to === undefined){
    const query = messagePickerDto.parse({ q }).q ?? '';
    const { search, everyone, rows } = loadMessagePicker(user, query);

    return <MessagePicker q={query} search={search} everyone={everyone} rows={resource(z.array(messagePickerRowResource), rows)} />;
  }

  const peerId = idOrFail(typeof to === 'string' ? to : '');

  if(peerId === user.id){
    return redirect('/office/messages');
  }

  const existing = db.transaction(tx => findDialogBetween(tx, user.id, peerId));

  if(existing){
    return redirect(`/office/messages/${existing.id}`);
  }

  const view = db.transaction(tx => loadDialogView(tx, user, peerId, null));

  if(!view){
    return notFound();
  }

  return <DialogView dialog={resource(dialogViewResource, view)} />;
}
