import Link from "@/components/general/Link";
import type { Route } from "next";

type ReportKind = 'posts' | 'comments'

type ReportKindTabsProps = {
  active: ReportKind,
  counts: Record<ReportKind, number>
}

/*
  Переключатель видов жалоб над вкладками очереди (спека 36): «Посты» / «Комментарии» с
  числом открытых. Над layout'ом раздела не поднят — у раздела нет своей проверки прав, числа
  считает каждая page после breakIfCant
*/
export default function ReportKindTabs({ active, counts }: ReportKindTabsProps) {
  return (
    <nav className="ui-report-kinds" aria-label="Вид жалоб">
      { KINDS.map(kind => (
        <Link key={kind.key} href={kind.href} data-active={kind.key === active} aria-current={kind.key === active ? 'page' : undefined}>
          { kind.label }
          <span className="ui-report-kinds__count" data-empty={counts[kind.key] === 0}>{ counts[kind.key] }</span>
        </Link>
      )) }
    </nav>
  );
}

const KINDS: { key: ReportKind, label: string, href: Route }[] = [
  { key: 'posts', label: 'Посты', href: '/office/moderation/reports/posts' },
  { key: 'comments', label: 'Комментарии', href: '/office/moderation/reports/comments' },
];
