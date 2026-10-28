import { db } from "@/globals/db";
import { resource } from "@/core/resource";
import DialogView from "@/domains/messages/components/DialogView";
import { dialogViewResource } from "@/domains/messages/dto/messageResources";
import { findDialogBetween } from "@/domains/messages/shared/messageAccess";
import { loadDialogView } from "@/domains/messages/shared/loadMessages";
import { requireAuthUser } from "@/shared/auth";
import { idOrFail } from "@/shared/params";
import { notFound, redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Новое сообщение' };

/*
  «Написать» со страницы автора: диалог уже есть — сразу туда, иначе шапка собеседника и поле
  ввода; диалог создаст первое сообщение
*/
export default async function OfficeNewMessage({ searchParams }: PageProps<'/office/messages/new'>) {
  const user = await requireAuthUser();
  const { to } = await searchParams;
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
