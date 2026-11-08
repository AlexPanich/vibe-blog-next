'use client'

import 'client-only';
import { StrictResource } from "@/core/resource";
import DialogList from "@/domains/messages/components/DialogList";
import MessagePeopleRow from "@/domains/messages/components/MessagePeopleRow";
import type { DialogRowResource, MessagePeerResource } from "@/domains/messages/dto/messageResources";
import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";

type MessengerSideProps<T extends DialogRowResource[], P extends MessagePeerResource[]> = {
  meId: number,
  dialogs: StrictResource<T, DialogRowResource[]>,
  hasMore: boolean,
  ignored: StrictResource<P, MessagePeerResource[]>,
  restricted: StrictResource<P, MessagePeerResource[]>
}

const TABS = {
  dialogs:    { label: 'Переписки',    empty: '' },
  ignored:    { label: 'Скрытые',      empty: 'Скрытых переписок нет. Скрыть можно в меню «…» диалога — новые сообщения из неё не будут беспокоить.' },
  restricted: { label: 'Ограниченные', empty: 'Вы никому не запрещали писать. Запретить можно в меню «…» диалога или на странице автора.' },
} as const;

type Tab = keyof typeof TABS

/*
  Левая колонка «Сообщений» (спека 42): вкладки и поиск по имени над списком. Вкладка — состояние
  колонки, не адрес: колонка живёт в layout и не видит searchParams. Скрытые и ограниченные —
  короткие списки, ищутся на месте
*/
export default function MessengerSide<T extends DialogRowResource[], P extends MessagePeerResource[]>({ meId, dialogs, hasMore, ignored, restricted }: MessengerSideProps<T, P>) {
  const [ tab, setTab ] = useState<Tab>('dialogs');
  const [ q, setQ ] = useState('');
  const needle = q.trim().toLocaleLowerCase('ru');
  const people = (tab === 'ignored' ? ignored : restricted).filter(p => p.name.toLocaleLowerCase('ru').includes(needle));

  return (
    <aside className="ui-messenger__side">
      <div className="ui-messenger__side-head">
        <nav className="ui-tabs" aria-label="Списки">
          { (Object.keys(TABS) as Tab[]).map(t => (
            <button key={t} type="button" className="ui-tabs__tab" data-active={t === tab} aria-pressed={t === tab} onClick={() => setTab(t)}>
              { TABS[t].label }
              { t !== 'dialogs' && (t === 'ignored' ? ignored : restricted).length > 0 && <span className="ui-tabs__count">{ (t === 'ignored' ? ignored : restricted).length }</span> }
            </button>
          )) }
        </nav>
        <TextInput
          className="ui-messenger__search"
          radius="xl"
          leftSection={<IconSearch size={15} />}
          placeholder="Поиск по имени"
          aria-label="Поиск по имени"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      { tab === 'dialogs'
        ? <DialogList meId={meId} dialogs={dialogs} hasMore={hasMore} q={q.trim()} />
        : people.length === 0
          ? <p className="ui-chat-list__empty">{ needle === '' ? TABS[tab].empty : 'Никого не нашлось' }</p>
          : <div className="ui-chat-list">
              { people.map(peer => <MessagePeopleRow key={peer.id} peer={peer} kind={tab} />) }
            </div> }
    </aside>
  );
}
