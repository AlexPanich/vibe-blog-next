import { requireAuthUser } from "@/shared/auth";
import { resource } from "@/core/resource";
import OfficeHead from "@/components/layout/OfficeHead";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import Link from "@/components/general/Link";
import OfficeCommentList from "@/domains/comments/components/OfficeCommentList";
import { officeCommentListResource } from "@/domains/comments/dto/commentResources";
import { OFFICE_COMMENT_TABS, type OfficeCommentTab } from "@/domains/comments/dto/commentRequests";
import { countOfficeComments, loadOfficeComments } from "@/domains/comments/shared/loadOfficeComments";
import { IconMessage } from "@tabler/icons-react";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Комментарии' };

/*
  «Комментарии» (спека 42, шаг 10): вкладки «К моим постам» / «Мои» с числами (?tab=), список
  карточек порциями. Без ?tab= открывается «К моим постам», если там что-то есть, иначе «Мои»
*/
export default async function OfficeComments({ searchParams }: PageProps<'/office/comments'>) {
  const user = await requireAuthUser();
  const counts = await countOfficeComments(user.id);
  const { tab = counts.received > 0 ? 'received' : 'mine' } = tabDto.parse(await searchParams);

  return (
    <>
      <OfficeHead title="Комментарии" sub="Ваши комментарии и то, что пишут под вашими постами" />

      <nav className="ui-tabs" aria-label="Комментарии">
        { OFFICE_COMMENT_TABS.map(t => (
          <Link key={t} href={`/office/comments?tab=${t}`} data-active={t === tab}>
            { TABS[t].label } <span className="ui-tabs__count">{ counts[t] }</span>
          </Link>
        )) }
      </nav>

      { counts[tab] === 0 ? (
        <EmptyState
          icon={IconMessage}
          title={TABS[tab].empty.title}
          action={tab === 'mine' && <ButtonLink href="/posts" variant="default">В ленту</ButtonLink>}
        >
          { TABS[tab].empty.text }
        </EmptyState>
      ) : <CommentsTab userId={user.id} tab={tab} /> }
    </>
  );
}

const TABS: Record<OfficeCommentTab, { label: string, empty: { title: string, text: string } }> = {
  received: {
    label: 'К моим постам',
    empty: { title: 'Комментариев к вашим постам пока нет', text: 'Когда читатели ответят под вашими опубликованными постами, комментарии соберутся здесь.' }
  },
  mine: {
    label: 'Мои',
    empty: { title: 'Вы ещё ничего не комментировали', text: 'Обсудить пост можно под ним — форма комментария внизу страницы поста.' }
  },
};

const tabDto = z.object({ tab: z.enum(OFFICE_COMMENT_TABS).optional().catch(undefined) });

async function CommentsTab({ userId, tab }: { userId: number, tab: OfficeCommentTab }){
  const { items, hasMore } = await loadOfficeComments(userId, tab);

  // key — новая вкладка начинает список заново, а не дописывает к прежней
  return <OfficeCommentList key={tab} tab={tab} initial={resource(officeCommentListResource, items)} hasMore={hasMore} />;
}
