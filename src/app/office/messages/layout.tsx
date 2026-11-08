import { resource } from "@/core/resource";
import MessengerSide from "@/domains/messages/components/MessengerSide";
import MessagesUnreadLine from "@/domains/messages/components/MessagesUnreadLine";
import { dialogRowResource, messagePeerResource } from "@/domains/messages/dto/messageResources";
import { countUnreadMessages, loadDialogRows, loadMessagePeople } from "@/domains/messages/shared/loadMessages";
import { requireAuthUser } from "@/shared/auth";
import OfficeHead from "@/components/layout/OfficeHead";
import z from "zod";

export const dynamic = 'force-dynamic';

/*
  «Сообщения» (спека 42): на десктопе — две колонки в одной рамке, слева список переписок,
  справа страница (пустая или диалог). Колонка списка живёт здесь и не перемонтируется при
  переходе между диалогами. На телефоне — две страницы: без диалога видна колонка, с диалогом —
  только он (CSS по .ui-dialog)
*/
export default async function OfficeMessagesLayout({ children }: LayoutProps<'/office/messages'>) {
  const user = await requireAuthUser();
  const { items, hasMore } = loadDialogRows(user.id);
  const people = z.array(messagePeerResource);

  return (
    <>
      <OfficeHead title="Сообщения" sub={<MessagesUnreadLine initial={countUnreadMessages(user.id)} />} />

      <div className="ui-messenger">
        <MessengerSide
          meId={user.id}
          dialogs={resource(z.array(dialogRowResource), items)}
          hasMore={hasMore}
          ignored={resource(people, loadMessagePeople(user.id, 'ignored'))}
          restricted={resource(people, loadMessagePeople(user.id, 'restricted'))}
        />
        <div className="ui-messenger__main">
          { children }
        </div>
      </div>
    </>
  );
}
