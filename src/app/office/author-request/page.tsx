import { db } from "@/globals/db";
import { authorRequests } from "@/database/schema";
import { requireAuthUser } from "@/shared/auth";
import LocalDate from "@/components/general/LocalDate";
import AuthorRequestForm from "@/domains/users/components/authorRequest/AuthorRequestForm";
import AuthorRequestHero from "@/domains/users/components/authorRequest/AuthorRequestHero";
import AuthorRequestHistory from "@/domains/users/components/authorRequest/AuthorRequestHistory";
import AuthorRequestWithdraw from "@/domains/users/components/authorRequest/AuthorRequestWithdraw";
import { authorRequestState } from "@/domains/users/shared/authorRequests";
import { createPost } from "@/domains/posts/policy";
import ButtonLink from "@/components/general/ButtonLink";
import { and, desc, eq, ne } from "drizzle-orm";
import { IconPencilPlus } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Заявка в авторы' };

const DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };

/*
  Заявка в авторы (спека 42, шаг 12): баннер с шагами, ниже форма или поданная заявка,
  ещё ниже — рассмотренные
*/
export default async function OfficeAuthorRequest() {
  const user = await requireAuthUser();
  const history = await db.query.authorRequests.findMany({
    where: and(eq(authorRequests.userId, user.id), ne(authorRequests.status, 'pending')),
    orderBy: desc(authorRequests.decidedAt)
  });

  if(createPost(user)){
    return (
      <div className="ui-request">
        <AuthorRequestHero
          stage="author"
          title="Вы уже автор"
          text="Заявка не нужна — роль автора у вас есть. Посты проходят модерацию перед публикацией."
          shortText="Заявка не нужна — роль автора у вас есть."
          action={<ButtonLink href="/office/posts/create" radius="xl" variant="white" leftSection={<IconPencilPlus size={16} />}>
            Написать пост
          </ButtonLink>}
        />
        <AuthorRequestHistory requests={history} />
      </div>
    );
  }

  const { pending, nextAt } = authorRequestState(user.id);

  return (
    <div className="ui-request">
      { pending ? <>
        <AuthorRequestHero
          stage="pending"
          title="Заявка на рассмотрении"
          text={<>Подана <LocalDate value={pending.createdAt} options={DAY} />. Администратор ответит уведомлением — пока заявка ждёт, её можно отозвать.</>}
          shortText="Администратор ответит уведомлением."
        />
        <section className="ui-request-card">
          <h2 className="ui-request-card__title">Ваша заявка</h2>
          <p className="ui-request-card__text">{ pending.text }</p>
          <div className="ui-request-card__foot">
            <p className="ui-request-card__hint">Отозванная заявка удаляется — новую можно подать сразу</p>
            <AuthorRequestWithdraw />
          </div>
        </section>
      </> : nextAt ? (
        // Причина — в «Рассмотренных» ниже
        <AuthorRequestHero
          stage="new"
          title="Заявка отклонена"
          text={<>Новую заявку можно подать с <LocalDate value={nextAt} options={DAY} />. Причина отказа — ниже, учтите её в новой заявке.</>}
          shortText={<>Новую заявку можно подать с <LocalDate value={nextAt} options={DAY} />.</>}
        />
      ) : <>
        <AuthorRequestHero
          stage="new"
          title="Хотите писать посты?"
          text="Роль автора выдаёт администратор. Расскажите, о чём хотите писать, — ответ придёт уведомлением. Пока можно читать, комментировать и подписываться."
          shortText="Роль автора выдаёт администратор — ответ придёт уведомлением."
        />
        <AuthorRequestForm />
      </> }

      <AuthorRequestHistory requests={history} />
    </div>
  );
}
