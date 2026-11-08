import { requireAuthUser } from "@/shared/auth";
import OfficeHead from "@/components/layout/OfficeHead";
import Link from "@/components/general/Link";
import LocalDate from "@/components/general/LocalDate";
import AvatarForm from "@/domains/users/components/AvatarForm";
import UserBioForm from "@/domains/users/components/UserBioForm";
import PasswordChangeForm from "@/domains/users/components/PasswordChangeForm";
import EmailChangeForm from "@/domains/users/components/EmailChangeForm";
import ProfileSection from "@/domains/users/components/profile/ProfileSection";
import ProfileRoles from "@/domains/users/components/profile/ProfileRoles";
import ProfileSecurityRow from "@/domains/users/components/profile/ProfileSecurityRow";
import MessagesFriendsOnlyForm from "@/domains/messages/components/MessagesFriendsOnlyForm";
import { db } from "@/globals/db";
import { accounts, users } from "@/database/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { IconArrowUpRight, IconLock, IconMail } from "@tabler/icons-react";

export const metadata = { title: 'Профиль' };

/*
  Профиль (спека 42, шаг 11): секции «подпись слева — поля справа», каждая сохраняется своей
  кнопкой. Формы email и пароля открываются по «Изменить» / «Сменить»
*/
export default async function OfficeProfile() {
  const user = await requireAuthUser();
  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { bio: true, avatarKey: true, messagesFriendsOnly: true, emailVerified: true }
  });
  // Вошедший только через GitHub пароля не имеет — ни смены пароля, ни смены email (там нужен пароль)
  const credential = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential'), isNotNull(accounts.password)),
    columns: { updatedAt: true }
  });
  const isAuthor = user.roles.includes('author');

  return (
    <>
      <OfficeHead
        title="Профиль"
        sub="Как вас видят читатели и кто может вам писать"
        action={isAuthor && <Link href={`/authors/${user.id}`} className="ui-account-open">
          <span className="ui-account-open__long">Открыть мою страницу автора</span>
          <span className="ui-account-open__short">Моя страница автора</span>
          <IconArrowUpRight size={15} stroke={2} />
        </Link>}
      />

      <div className="ui-account">
        <ProfileSection title="Аватар" hint="Виден на странице автора, у постов и комментариев" mobileTitle={false}>
          <AvatarForm name={user.name} avatarKey={profile?.avatarKey ?? null} />
        </ProfileSection>

        <ProfileSection title="Публичная страница" hint="Имя и пара строк о себе — на странице автора">
          <UserBioForm name={user.name} bio={profile?.bio ?? ''} />
        </ProfileSection>

        <ProfileSection title="Роли" hint="Выдаёт администратор">
          <ProfileRoles roles={user.roles} />
        </ProfileSection>

        <ProfileSection title="Личные сообщения" hint="Кто может мне писать" mobileTitle="Кто может мне писать">
          <MessagesFriendsOnlyForm friendsOnly={profile?.messagesFriendsOnly ?? false} />
        </ProfileSection>

        <ProfileSection title="Безопасность" hint="Пароль и email для входа">
          <div className="ui-account-security">
            <ProfileSecurityRow
              icon={<IconMail size={18} stroke={1.8} />}
              title="Email"
              text={<>{ user.email } · { profile?.emailVerified ? 'подтверждён' : 'не подтверждён' }</>}
              action={credential ? 'Изменить' : undefined}
            >
              <EmailChangeForm />
            </ProfileSecurityRow>

            { credential ? (
              <ProfileSecurityRow
                icon={<IconLock size={18} stroke={1.8} />}
                title="Пароль"
                text={<>изменён <LocalDate value={credential.updatedAt} relative /></>}
                action="Сменить"
              >
                <PasswordChangeForm />
              </ProfileSecurityRow>
            ) : (
              <ProfileSecurityRow
                icon={<IconLock size={18} stroke={1.8} />}
                title="Пароль"
                text="Не задан — вы входите через GitHub. С паролем откроется и смена email"
                href="/auth/forgot-password"
                action="Задать"
              />
            ) }
          </div>
        </ProfileSection>
      </div>
    </>
  );
}
