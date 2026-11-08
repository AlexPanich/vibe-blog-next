import { CONTAINER } from "@/globals/container";
import { requireAuthUser } from "@/shared/auth";
import { manageUsers } from "@/domains/users/policy";
import AuthorRequestCard from "@/domains/users/components/authorRequest/AuthorRequestCard";
import AuthorRequestDecidedList from "@/domains/users/components/authorRequest/AuthorRequestDecidedList";
import { authorRequestAdminFilterDto } from "@/domains/users/dto/authorRequestRequests";
import { loadAdminAuthorRequests, RECENT_DECIDED_REQUESTS } from "@/domains/users/shared/loadAdminAuthorRequests";
import { adminAuthorRequestsUrl } from "@/domains/users/shared/adminAuthorRequestsUrl";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import Pager from "@/components/general/Pager";
import { IconArrowRight, IconChecks } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Заявки в авторы' };

/*
  «Заявки в авторы» в админке (спека 42, шаг 20): вкладки «Ожидают / Рассмотренные» с
  числами (?tab=). Ожидающие — карточками с решением, под ними — последние решения;
  «Рассмотренные» — список с пагинацией (?page=)
*/
export default async function AdminAuthorRequests({ searchParams }: PageProps<'/office/admin/author-requests'>) {
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const me = await requireAuthUser();
  const filter = authorRequestAdminFilterDto.parse(await searchParams);
  const { pending, decided, counts, page, pages } = await loadAdminAuthorRequests(filter);

  return (
    <>
      <OfficeHead title="Заявки в авторы" sub="Решение придёт пользователю уведомлением" />

      <nav className="ui-tabs" aria-label="Заявки">
        <Link href={adminAuthorRequestsUrl({})} data-active={filter.tab === 'pending'}>
          Ожидают <span className="ui-tabs__count">{ counts.pending }</span>
        </Link>
        <Link href={adminAuthorRequestsUrl({ tab: 'decided' })} data-active={filter.tab === 'decided'}>
          Рассмотренные <span className="ui-tabs__count">{ counts.decided }</span>
        </Link>
      </nav>

      { filter.tab === 'pending' ? <>
        { pending.length === 0 ? (
          <div className="ui-empty">
            <IconChecks size={26} stroke={1.6} />
            <p>Новых заявок нет.</p>
          </div>
        ) : (
          <div className="ui-request-reviews">
            { pending.map(request => <AuthorRequestCard key={request.id} request={request} own={request.user.id === me.id} />) }
          </div>
        ) }

        { decided.length > 0 && <section className="ui-request-recent">
          <div className="ui-request-recent__head">
            <h2 className="ui-request-recent__title">Недавно рассмотренные</h2>
            { counts.decided > RECENT_DECIDED_REQUESTS && <Link href={adminAuthorRequestsUrl({ tab: 'decided' })} className="ui-request-recent__all">
              Все <IconArrowRight size={14} stroke={2} />
            </Link> }
          </div>
          <AuthorRequestDecidedList requests={decided} meId={me.id} />
        </section> }
      </> : <>
        { decided.length === 0 ? (
          <div className="ui-empty">
            <IconChecks size={26} stroke={1.6} />
            <p>Рассмотренных заявок нет.</p>
          </div>
        ) : (
          <AuthorRequestDecidedList requests={decided} meId={me.id} />
        ) }

        <Pager page={page} pages={pages} href={n => adminAuthorRequestsUrl({ tab: 'decided', page: n })} />
      </> }
    </>
  );
}
