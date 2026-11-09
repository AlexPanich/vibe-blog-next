import { CONTAINER } from "@/globals/container";
import { resource } from "@/core/resource";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import Pager from "@/components/general/Pager";
import ReportKindTabs from "@/components/office/ReportKindTabs";
import CommentReportCard from "@/domains/comments/components/CommentReportCard";
import { commentReportRowResource, type CommentReportRowResource } from "@/domains/comments/dto/commentResources";
import { COMMENT_REPORT_TABS, commentReportFilterDto, type CommentReportTab } from "@/domains/comments/dto/commentRequests";
import { moderateComments } from "@/domains/comments/policy";
import { countOpenCommentReports } from "@/domains/comments/shared/commentReports";
import { countResolvedReportGroups, loadOpenCommentReports, loadResolvedCommentReports } from "@/domains/comments/shared/loadCommentReports";
import { manageUser } from "@/domains/users/policy";
import { moderatePosts } from "@/domains/posts/policy";
import { countOpenPostReports } from "@/domains/posts/shared/postReports";
import { requireAuthUser } from "@/shared/auth";
import type { AuthUser } from "@/shared/authUser";
import { IconChecks, IconCircleCheck } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Жалобы на комментарии' };

// Подсказка «разберёте — и жалоб не останется» — когда открытых немного
const DONE_HINT_MAX = 3;

/*
  Жалобы на комментарии (спека 42, шаг 15; адрес — спека 36): переключатель «Посты /
  Комментарии», вкладки «Открытые» / «Рассмотренные» с числами
  (?tab=resolved&page=N). Открытые — все сразу, дольше всех ждущие сверху; рассмотренные —
  свежие решения сверху, порциями
*/
export default async function ModerationCommentReports({ searchParams }: PageProps<'/office/moderation/reports/comments'>) {
  await CONTAINER.boucerService.breakIfCant(moderateComments);

  const user = await requireAuthUser();
  const { tab, page } = commentReportFilterDto.parse(await searchParams);
  const counts: Record<CommentReportTab, number> = {
    open: await countOpenCommentReports(),
    resolved: await countResolvedReportGroups()
  };
  const postCount = moderatePosts(user) ? await countOpenPostReports() : 0;
  const { items, pages } = tab === 'open'
    ? { items: await loadOpenCommentReports(), pages: 1 }
    : await loadResolvedCommentReports(page);

  return (
    <>
      <OfficeHead title="Жалобы" sub="Комментарии, на которые пожаловались читатели" />

      <ReportKindTabs active="comments" counts={{ posts: postCount, comments: counts.open }} />

      <nav className="ui-tabs" aria-label="Жалобы на комментарии">
        { COMMENT_REPORT_TABS.map(t => (
          <Link key={t} href={t === 'open' ? '/office/moderation/reports/comments' : '/office/moderation/reports/comments?tab=resolved'} data-active={t === tab}>
            { TABS[t].label } <span className="ui-tabs__count">{ counts[t] }</span>
          </Link>
        )) }
      </nav>

      { items.length === 0 ? (
        <div className="ui-empty">
          <IconChecks size={26} stroke={1.6} />
          <p>{ TABS[tab].empty }</p>
        </div>
      ) : (
        <div className="ui-report-cards">
          { items.map(row => <ReportCard key={`${row.commentId}-${row.resolution?.at.getTime() ?? 'open'}`} row={row} user={user} />) }
        </div>
      ) }

      { tab === 'open' && items.length > 0 && items.length <= DONE_HINT_MAX && <p className="ui-report-done">
        <IconCircleCheck size={16} stroke={1.8} />
        { doneHint(items.length) }
      </p> }

      { tab === 'resolved' && <Pager
        page={Math.min(page, pages)}
        pages={pages}
        href={n => n === 1 ? '/office/moderation/reports/comments?tab=resolved' : `/office/moderation/reports/comments?tab=resolved&page=${n}`}
      /> }
    </>
  );
}

const TABS: Record<CommentReportTab, { label: string, empty: string }> = {
  open: { label: 'Открытые', empty: 'Жалоб нет — всё разобрано.' },
  resolved: { label: 'Рассмотренные', empty: 'Рассмотренных жалоб пока нет.' }
};

function ReportCard({ row, user }: { row: CommentReportRowResource, user: AuthUser }){
  return <CommentReportCard
    row={resource(commentReportRowResource, row)}
    own={row.author.id === user.id}
    canBan={manageUser(user, { id: row.author.id })}
  />;
}

function doneHint(n: number){
  if(n === 1){
    return 'Разберёте эту — и жалоб не останется';
  }

  return `Разберёте эти ${n === 2 ? 'две' : 'три'} — и жалоб не останется`;
}
