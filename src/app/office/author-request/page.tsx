import { db } from "@/globals/db";
import { authorRequests } from "@/database/schema";
import { requireAuthUser } from "@/shared/auth";
import ButtonLink from "@/components/general/ButtonLink";
import EmptyState from "@/components/general/EmptyState";
import LocalDate from "@/components/general/LocalDate";
import AuthorRequestForm from "@/domains/users/components/authorRequest/AuthorRequestForm";
import AuthorRequestWithdraw from "@/domains/users/components/authorRequest/AuthorRequestWithdraw";
import { authorRequestState } from "@/domains/users/shared/authorRequests";
import { createPost } from "@/domains/posts/policy";
import { and, desc, eq, ne } from "drizzle-orm";
import { IconPencilPlus } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Заявка в авторы' };

export default async function OfficeAuthorRequest() {
  const user = await requireAuthUser();

  if(createPost(user)){
    return (
      <>
        <div className="ui-section-head">
          <h1 className="ui-title">Заявка в авторы</h1>
        </div>
        <EmptyState
          icon={IconPencilPlus}
          title="Вы уже автор"
          action={<ButtonLink href="/office/posts/create" leftSection={<IconPencilPlus size={16} />}>Написать пост</ButtonLink>}
        >
          Заявка не нужна — роль автора у вас есть.
        </EmptyState>
      </>
    );
  }

  const { pending, nextAt } = authorRequestState(user.id);
  const history = await db.query.authorRequests.findMany({
    where: and(eq(authorRequests.userId, user.id), ne(authorRequests.status, 'pending')),
    orderBy: desc(authorRequests.decidedAt)
  });

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Заявка в авторы</h1>
      </div>

      { pending ? (
        <section className="ui-panel ui-panel--form">
          <div className="ui-panel__head">
            <p className="ui-kicker">Подана <LocalDate value={pending.createdAt} options={{ dateStyle: 'medium' }} /></p>
            <h2 className="ui-panel__title">На рассмотрении</h2>
          </div>
          <p className="ui-comment__text">{ pending.text }</p>
          <p className="ui-meta">Администратор ответит уведомлением. Пока заявка ждёт, её можно отозвать.</p>
          <div className="ui-panel__foot">
            <AuthorRequestWithdraw />
          </div>
        </section>
      ) : nextAt ? (
        // Причина — в строке истории ниже
        <div className="ui-note ui-note--danger">
          <span className="ui-note__label">Заявка отклонена</span>
          Новую заявку можно подать с <LocalDate value={nextAt} options={{ dateStyle: 'long' }} />
        </div>
      ) : (
        <section className="ui-panel ui-panel--form">
          <div className="ui-panel__head">
            <p className="ui-kicker">Роль автора</p>
            <h2 className="ui-panel__title">Хотите писать посты?</h2>
          </div>
          <p>
            Роль автора выдаёт администратор. Расскажите, о чём хотите писать, — ответ придёт
            уведомлением. Посты автора проходят модерацию перед публикацией.
          </p>
          <AuthorRequestForm />
        </section>
      ) }

      { history.length > 0 && <>
        <div className="ui-section-head ui-section-head--sub">
          <h2 className="ui-panel__title">Рассмотренные</h2>
        </div>
        <div className="ui-rows">
          { history.map(request => (
            <div key={request.id} className="ui-row ui-row--static">
              <div className="ui-row__body">
                <p className="ui-row__excerpt">{ request.text }</p>
                { request.status === 'rejected' && <div className="ui-note ui-note--danger">
                  <span className="ui-note__label">Причина отказа</span>
                  { request.reason }
                </div> }
              </div>
              <div className="ui-row__aside">
                <span className="ui-status" data-status={request.status === 'approved' ? 'published' : 'rejected'}>
                  { request.status === 'approved' ? 'Одобрена' : 'Отклонена' }
                </span>
                { request.decidedAt && <span className="ui-meta">
                  <LocalDate value={request.decidedAt} options={{ dateStyle: 'medium' }} />
                </span> }
              </div>
            </div>
          )) }
        </div>
      </> }
    </>
  );
}
