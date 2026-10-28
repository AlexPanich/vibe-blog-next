import { db } from "@/globals/db";
import { messageIgnores, messageRestrictions, users } from "@/database/schema";
import { resource } from "@/core/resource";
import DialogList from "@/domains/messages/components/DialogList";
import MessagePeopleRow from "@/domains/messages/components/MessagePeopleRow";
import { dialogRowResource, messagePeerResource } from "@/domains/messages/dto/messageResources";
import { loadDialogRows } from "@/domains/messages/shared/loadMessages";
import { requireAuthUser } from "@/shared/auth";
import EmptyState from "@/components/general/EmptyState";
import { IconMessages } from "@tabler/icons-react";
import { eq } from "drizzle-orm";
import Link from "next/link";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Сообщения' };

const TABS = {
  dialogs:    { label: 'Переписки',    empty: '' },
  ignored:    { label: 'Скрытые',      empty: 'Скрыть переписку можно в строке списка или в шапке диалога — новые сообщения из неё не будут беспокоить.' },
  restricted: { label: 'Ограниченные', empty: 'Запретить человеку писать вам можно в шапке диалога или на странице автора.' },
} as const;

type Tab = keyof typeof TABS

const tabDto = z.object({ tab: z.enum([ 'dialogs', 'ignored', 'restricted' ]).catch('dialogs').default('dialogs') });

export default async function OfficeMessages({ searchParams }: PageProps<'/office/messages'>) {
  const user = await requireAuthUser();
  const { tab } = tabDto.parse(await searchParams);

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Сообщения</h1>
      </div>

      <nav className="ui-filter">
        { (Object.keys(TABS) as Tab[]).map(t => (
          <Link key={t} href={t === 'dialogs' ? '/office/messages' : `/office/messages?tab=${t}`} data-active={t === tab}>
            { TABS[t].label }
          </Link>
        )) }
      </nav>

      { tab === 'dialogs' ? <DialogsTab userId={user.id} /> : <PeopleTab userId={user.id} tab={tab} /> }
    </>
  );
}

function DialogsTab({ userId }: { userId: number }){
  const { items, hasMore } = loadDialogRows(userId);

  return <DialogList meId={userId} dialogs={resource(z.array(dialogRowResource), items)} hasMore={hasMore} />;
}

function PeopleTab({ userId, tab }: { userId: number, tab: Exclude<Tab, 'dialogs'> }){
  const columns = { id: users.id, name: users.name, avatarKey: users.avatarKey };
  const people = (tab === 'ignored'
    ? db.select(columns).from(messageIgnores).innerJoin(users, eq(users.id, messageIgnores.ignoredId)).where(eq(messageIgnores.userId, userId)).all()
    : db.select(columns).from(messageRestrictions).innerJoin(users, eq(users.id, messageRestrictions.restrictedId)).where(eq(messageRestrictions.userId, userId)).all()
  ).sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  if(people.length === 0){
    return (
      <EmptyState icon={IconMessages} title={tab === 'ignored' ? 'Скрытых переписок нет' : 'Вы никому не запрещали писать'}>
        { TABS[tab].empty }
      </EmptyState>
    );
  }

  return (
    <div className="ui-rows">
      { people.map(peer => <MessagePeopleRow key={peer.id} peer={resource(messagePeerResource, peer)} kind={tab} />) }
    </div>
  );
}
