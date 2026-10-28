import { db } from "@/globals/db";
import { resource } from "@/core/resource";
import DialogView from "@/domains/messages/components/DialogView";
import { dialogViewResource } from "@/domains/messages/dto/messageResources";
import { findOwnDialog } from "@/domains/messages/shared/messageAccess";
import { loadDialogView } from "@/domains/messages/shared/loadMessages";
import { requireAuthUser } from "@/shared/auth";
import { idOrFail } from "@/shared/params";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Диалог' };

// Чужой диалог — 404, как отсутствующий: staff переписку не видит
export default async function OfficeDialog({ params }: PageProps<'/office/messages/[id]'>) {
  const user = await requireAuthUser();
  const id = idOrFail((await params).id);
  const view = db.transaction(tx => {
    const dialog = findOwnDialog(tx, id, user.id);

    return dialog && loadDialogView(tx, user, dialog.peerId, dialog.id);
  });

  if(!view){
    return notFound();
  }

  return <DialogView key={id} dialog={resource(dialogViewResource, view)} />;
}
