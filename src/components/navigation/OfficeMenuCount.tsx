'use client'

import 'client-only';
import type { OfficeMenuResource } from "@/components/navigation/officeMenuResource";
import { OFFICE_COUNT_TONES } from "@/components/navigation/officeMenuItems";
import MessagesMenuCount from "@/domains/messages/exports/MessagesMenuCount";
import NotificationsMenuCount from "@/domains/notifications/exports/NotificationsMenuCount";

type Counts = OfficeMenuResource['counts'];

// Бейдж пункта меню. Сообщения и уведомления живые — обновляются по событиям канала
export default function OfficeMenuCount({ kind, counts }: { kind: keyof Counts, counts: Counts }) {
  if(kind === 'messages'){
    return <MessagesMenuCount initial={counts.messages} />;
  }

  if(kind === 'notifications'){
    return <NotificationsMenuCount initial={counts.notifications} />;
  }

  return counts[kind] > 0 ? <span className="ui-desk__count" data-tone={OFFICE_COUNT_TONES[kind]}>{ counts[kind] }</span> : null;
}
