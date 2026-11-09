import { CONTAINER } from "@/globals/container";
import { resource } from "@/core/resource";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import Pager from "@/components/general/Pager";
import ReportKindTabs from "@/components/office/ReportKindTabs";
import PostReportCard from "@/domains/posts/components/PostReportCard";
import { postReportRowResource, type PostReportRowResource } from "@/domains/posts/dto/postResources";
import { POST_REPORT_TABS, postReportFilterDto, type PostReportTab } from "@/domains/posts/dto/postReportRequests";
import { moderatePosts } from "@/domains/posts/policy";
import { countOpenPostReports } from "@/domains/posts/shared/postReports";
import { countResolvedPostReportGroups, loadOpenPostReports, loadResolvedPostReports } from "@/domains/posts/shared/loadPostReports";
import { countOpenCommentReports } from "@/domains/comments/shared/commentReports";
import { moderateComments } from "@/domains/comments/policy";
import { requireAuthUser } from "@/shared/auth";
import type { AuthUser } from "@/shared/authUser";
import { IconChecks, IconCircleCheck } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Жалобы на посты' };

// Подсказка «разберёте — и жалоб не останется» — когда открытых немного
const DONE_HINT_MAX = 3;

/*
  Жалобы на посты (спека 36): переключатель «Посты / Комментарии», вкладки «Открытые» /
  «Рассмотренные» с числами (?tab=resolved&page=N). Открытые — все сразу, дольше всех ждущие
  сверху; рассмотренные — свежие решения сверху, порциями
*/
export default async function ModerationPostReports({ searchParams }: PageProps<'/office/moderation/reports/posts'>) {
  await CONTAINER.boucerService.breakIfCant(moderatePosts);

  const user = await requireAuthUser();
  const { tab, page } = postReportFilterDto.parse(await searchParams);
  const counts: Record<PostReportTab, number> = {
    open: await countOpenPostReports(),
    resolved: await countResolvedPostReportGroups()
  };
  const commentCount = moderateComments(user) ? await countOpenCommentReports() : 0;
  const { items, pages } = tab === 'open'
    ? { items: await loadOpenPostReports(), pages: 1 }
    : await loadResolvedPostReports(page);

  return (
    <>
      <OfficeHead title="Жалобы" sub="Посты, на которые пожаловались читатели" />

      <ReportKindTabs active="posts" counts={{ posts: counts.open, comments: commentCount }} />

      <nav className="ui-tabs" aria-label="Жалобы на посты">
        { POST_REPORT_TABS.map(t => (
          <Link key={t} href={t === 'open' ? '/office/moderation/reports/posts' : '/office/moderation/reports/posts?tab=resolved'} data-active={t === tab}>
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
          { items.map(row => <ReportCard key={`${row.postId}-${row.resolution?.at.getTime() ?? 'open'}`} row={row} user={user} />) }
        </div>
      ) }

      { tab === 'open' && items.length > 0 && items.length <= DONE_HINT_MAX && <p className="ui-report-done">
        <IconCircleCheck size={16} stroke={1.8} />
        { doneHint(items.length) }
      </p> }

      { tab === 'resolved' && <Pager
        page={Math.min(page, pages)}
        pages={pages}
        href={n => n === 1 ? '/office/moderation/reports/posts?tab=resolved' : `/office/moderation/reports/posts?tab=resolved&page=${n}`}
      /> }
    </>
  );
}

const TABS: Record<PostReportTab, { label: string, empty: string }> = {
  open: { label: 'Открытые', empty: 'Жалоб на посты нет — всё разобрано.' },
  resolved: { label: 'Рассмотренные', empty: 'Рассмотренных жалоб на посты пока нет.' }
};

function ReportCard({ row, user }: { row: PostReportRowResource, user: AuthUser }){
  return <PostReportCard row={resource(postReportRowResource, row)} own={row.author.id === user.id} />;
}

function doneHint(n: number){
  if(n === 1){
    return 'Разберёте эту — и жалоб не останется';
  }

  return `Разберёте эти ${n === 2 ? 'две' : 'три'} — и жалоб не останется`;
}
