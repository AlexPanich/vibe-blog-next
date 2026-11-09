'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { StrictResource } from "@/core/resource";
import type { MessagePickerRowResource } from "@/domains/messages/dto/messageResources";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { Loader, TextInput } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type MessagePickerProps<T extends MessagePickerRowResource[]> = {
  q: string,
  search: boolean,
  // Поиск по всем пользователям (staff), а не только по авторам и связям
  everyone: boolean,
  rows: StrictResource<T, MessagePickerRowResource[]>
}

const QUERY_DELAY = 300;

/*
  Выбор собеседника (спека 50). Запрос живёт в адресе (?q=): поле с задержкой обновляет его через
  router.replace, людей загружает страница на сервере. Компонент не перемонтируется при смене
  адреса — значение поля локальное, фокус не теряется. Корень — .ui-dialog: на телефоне выбор
  занимает экран, как диалог. Строка с перепиской ведёт в неё и при запрете (историю читать
  можно), без переписки и с причиной — серая, без ссылки
*/
export default function MessagePicker<T extends MessagePickerRowResource[]>({ q, search, everyone, rows }: MessagePickerProps<T>) {
  const router = useRouter();
  const [ value, setValue ] = useState(q);
  const [ pending, startTransition ] = useTransition();

  useEffect(() => {
    const next = value.trim();

    if(next === q){
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(next === '' ? '/office/messages/new' : `/office/messages/new?q=${encodeURIComponent(next)}`, { scroll: false });
      });
    }, QUERY_DELAY);

    return () => clearTimeout(timer);
  }, [ value, q, router ]);

  return (
    <section className="ui-dialog ui-picker">
      <div className="ui-dialog__head">
        <Link href="/office/messages" className="ui-dialog__back" aria-label="К сообщениям"><IconChevronLeft size={22} stroke={2} /></Link>
        <h2 className="ui-picker__title">Новое сообщение</h2>
      </div>

      <div className="ui-picker__search">
        <TextInput
          className="ui-messenger__search"
          radius="xl"
          leftSection={<span className="ui-picker__to">Кому:</span>}
          leftSectionWidth={60}
          rightSection={pending && <Loader size="xs" />}
          placeholder="Имя"
          aria-label="Кому: имя"
          data-autofocus
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
        />
      </div>

      <div className="ui-picker__body">
        { rows.length > 0 && <p className="ui-picker__group">{ search ? 'Найдено' : 'Ваши подписки' }</p> }

        { rows.length === 0 && (search
          ? <>
              <p className="ui-picker__group">Никого не нашлось</p>
              <p className="ui-chat-list__empty">{ everyone ? 'Ищем среди всех пользователей' : 'Ищем среди авторов, ваших подписок и подписчиков' }</p>
            </>
          : <p className="ui-chat-list__empty">
              Подпишитесь на авторов или найдите человека по имени. <Link href="/authors">К авторам</Link>
            </p>) }

        { rows.length > 0 && <div className="ui-chat-list">
          { rows.map(row => <PickerRow key={row.id} row={row} />) }
        </div> }
      </div>
    </section>
  );
}

function PickerRow({ row }: { row: MessagePickerRowResource }) {
  const body = (
    <>
      <UserAvatar name={row.name} avatarKey={row.avatarKey} size={44} />
      <span className="ui-chat-row__body">
        <span className="ui-chat-row__top">
          <span className="ui-chat-row__name">{ row.name }</span>
          { row.hasDialog && <span className="ui-picker__badge">есть переписка</span> }
        </span>
        <span className="ui-chat-row__bottom">
          <span className="ui-chat-row__text">{ row.blockReason ?? label(row) }</span>
        </span>
      </span>
    </>
  );

  if(row.hasDialog || row.blockReason === null){
    return <Link href={`/office/messages/new?to=${row.id}`} className="ui-chat-row">{ body }</Link>;
  }

  return <div className="ui-chat-row" data-disabled="true">{ body }</div>;
}

// Подпись строки — первая подходящая связь: я читаю → автор → читает меня; без связи (поиск staff) — читатель
function label(row: MessagePickerRowResource){
  if(row.following){
    return 'Подписка';
  }

  if(row.author){
    return 'Автор';
  }

  if(row.follower){
    return 'Подписчик';
  }

  return 'Читатель';
}
