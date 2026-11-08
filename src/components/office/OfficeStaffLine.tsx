import Link from "@/components/general/Link";
import { plural } from "@/core/plural";
import { IconArrowRight, IconShieldCheck } from "@tabler/icons-react";
import type { Route } from "next";

type Queue = { label: string, value: string, href: Route }

type StaffLineProps = {
  // null — очередь этой роли не видна
  moderating: number | null,
  reports: number | null,
  authorRequests: number | null
}

/*
  Жёлтая строка модерации на «Начале» (спека 42): только числа и ссылки на очереди, сами
  очереди здесь не повторяются. Числа — те же, что у бейджей меню
*/
export default function OfficeStaffLine({ moderating, reports, authorRequests }: StaffLineProps) {
  const queues: Queue[] = [];

  if(moderating !== null){
    queues.push({ label: 'На проверке', value: `${moderating} ${plural(moderating, [ 'пост', 'поста', 'постов' ])}`, href: '/office/moderation/posts' });
  }

  if(reports !== null){
    queues.push({ label: 'Жалобы', value: String(reports), href: '/office/moderation/comments' });
  }

  if(authorRequests !== null){
    queues.push({ label: 'Заявки в авторы', value: String(authorRequests), href: '/office/admin/author-requests' });
  }

  const waiting = (moderating ?? 0) + (reports ?? 0) + (authorRequests ?? 0) > 0;

  return (
    <div className="ui-staff-line" data-quiet={!waiting}>
      <span className="ui-staff-line__label">
        <IconShieldCheck size={18} stroke={1.8} />{ waiting ? 'Модерация ждёт вас' : 'Модерация: всё разобрано' }
      </span>
      { queues.map(queue => (
        <Link key={queue.href} href={queue.href} className="ui-staff-line__queue">
          { queue.label } <b>{ queue.value }</b><IconArrowRight size={14} stroke={2} />
        </Link>
      )) }
    </div>
  );
}
