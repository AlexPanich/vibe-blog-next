import { requireAuthUser } from "@/shared/auth";
import LogoutBox from "@/domains/users/components/LogoutBox";
import PasswordChangeForm from "@/domains/users/components/PasswordChangeForm";
import EmailChangeForm from "@/domains/users/components/EmailChangeForm";
import UserBioForm from "@/domains/users/components/UserBioForm";
import AvatarForm from "@/domains/users/components/AvatarForm";
import MessagesFriendsOnlyForm from "@/domains/messages/components/MessagesFriendsOnlyForm";
import { db } from "@/globals/db";
import { accounts, users } from "@/database/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: 'Профиль' };

export default async function OfficeProfile() {
  const user = await requireAuthUser();
  // Вошедший только через GitHub пароля не имеет — ни смены пароля, ни смены email (там нужен пароль)
  const profile = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { bio: true, avatarKey: true, messagesFriendsOnly: true } });
  const hasPassword = !!await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential'), isNotNull(accounts.password))
  });

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Профиль</h1>
      </div>

      <section className="ui-panel ui-panel--form">
        <div className="ui-panel__head">
          <p className="ui-kicker">Аккаунт</p>
          <h2 className="ui-panel__title">{ user.name }</h2>
        </div>

        <dl className="ui-props">
          <dt>Email</dt>
          <dd>{ user.email }</dd>
          <dt>Роли</dt>
          <dd>
            { user.roles.length > 0
              ? user.roles.map(role => <span key={role} className="ui-tag">{ role }</span>)
              : '—' }
          </dd>
        </dl>

        <div className="ui-panel__foot">
          <LogoutBox variant="light" color="red" />
        </div>
      </section>

      <section className="ui-panel ui-panel--form">
        <div className="ui-panel__head">
          <p className="ui-kicker">Публичная страница</p>
          <h2 className="ui-panel__title">Аватар</h2>
        </div>
        <AvatarForm name={user.name} avatarKey={profile?.avatarKey ?? null} />
      </section>

      <section className="ui-panel ui-panel--form">
        <div className="ui-panel__head">
          <p className="ui-kicker">Публичная страница</p>
          <h2 className="ui-panel__title">О себе</h2>
        </div>
        <UserBioForm bio={profile?.bio ?? ''} />
        <div className="ui-panel__foot">
          <Link href={`/authors/${user.id}`}>Открыть мою страницу автора</Link>
        </div>
      </section>

      <section className="ui-panel ui-panel--form">
        <div className="ui-panel__head">
          <p className="ui-kicker">Личные сообщения</p>
          <h2 className="ui-panel__title">Кто может мне писать</h2>
        </div>
        <MessagesFriendsOnlyForm friendsOnly={profile?.messagesFriendsOnly ?? false} />
      </section>

      { hasPassword ? <>
        <section className="ui-panel ui-panel--form">
          <div className="ui-panel__head">
            <p className="ui-kicker">Безопасность</p>
            <h2 className="ui-panel__title">Пароль</h2>
          </div>
          <PasswordChangeForm />
        </section>

        <section className="ui-panel ui-panel--form">
          <div className="ui-panel__head">
            <p className="ui-kicker">Безопасность</p>
            <h2 className="ui-panel__title">Email</h2>
          </div>
          <EmailChangeForm />
        </section>
      </> : (
        <section className="ui-panel ui-panel--form">
          <div className="ui-panel__head">
            <p className="ui-kicker">Безопасность</p>
            <h2 className="ui-panel__title">Пароль и email</h2>
          </div>
          <p>
            Пароля нет: вы входите через GitHub. Задать пароль можно через{' '}
            <Link href="/auth/forgot-password">восстановление</Link> — после этого откроется и смена email.
          </p>
        </section>
      ) }
    </>
  );
}
