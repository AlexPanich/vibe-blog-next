import { CONTAINER } from "@/globals/container";
import { manageUser, manageUsers } from "@/domains/users/policy";
import UserAdminHero from "@/domains/users/components/admin/UserAdminHero";
import UserAdminCard from "@/domains/users/components/admin/UserAdminCard";
import UserRolesSwitches from "@/domains/users/components/admin/UserRolesSwitches";
import UserBanForm from "@/domains/users/components/admin/UserBanForm";
import UserAdminLog from "@/domains/users/components/admin/UserAdminLog";
import UserAvatarRemoveForm from "@/domains/users/components/admin/UserAvatarRemoveForm";
import UserCoverRemoveForm from "@/domains/users/components/admin/UserCoverRemoveForm";
import { userBanFormResource, userRolesFormResource } from "@/domains/users/dto/userResources";
import { loadAdminUser } from "@/domains/users/shared/loadAdminUser";
import OfficeCrumbs from "@/components/layout/OfficeCrumbs";
import LocalDate from "@/components/general/LocalDate";
import Link from "@/components/general/Link";
import { resource } from "@/core/resource";
import { requireAuthUser } from "@/shared/auth";
import { idOrFail } from "@/shared/params";
import { isBanActive } from "@/shared/userBan";
import { notFound } from "next/navigation";
import { IconChevronLeft, IconInfoCircle } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

/*
  Пользователь в админке (спека 42, шаг 19): шапка с цифрами, слева «Роли», «Аватар» и
  «Обложка» (спека 41), справа «Блокировка» и «Последние действия». Себя менять нельзя — вместо карточек
  управления плашка. На телефоне — одна колонка и «‹ Пользователи» вместо крошек
*/
export default async function AdminUsersItem({ params }: PageProps<'/office/admin/users/[id]'>) {
  const id = idOrFail((await params).id);
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const me = await requireAuthUser();
  const loaded = await loadAdminUser(id);

  if(!loaded){
    return notFound();
  }

  const { user, stats, events } = loaded;
  // Истёкший бан — как его нет (спека 46): форма бана и обычный список
  const banned = isBanActive(user);
  const back = banned ? '/office/admin/users?filter=banned' as const : '/office/admin/users' as const;
  const manageable = manageUser(me, user);
  const log = (
    <UserAdminCard title="Последние действия">
      <UserAdminLog events={events} year={new Date().getFullYear()} />
    </UserAdminCard>
  );

  return (
    <div className="ui-user-page">
      <OfficeCrumbs items={[ { label: 'Пользователи', href: back }, { label: user.name } ]} />
      <Link href={back} className="ui-backlink ui-user-page__back">
        <IconChevronLeft size={16} stroke={2} />Пользователи
      </Link>

      <UserAdminHero user={user} stats={stats} />

      { manageable ? (
        <div className="ui-user-page__columns">
          <div className="ui-user-page__column">
            <UserAdminCard title="Роли" hint="Читатель есть у всех. Остальные роли добавляют права">
              <UserRolesSwitches key={user.roles.join()} user={resource(userRolesFormResource, user)} />
            </UserAdminCard>

            { user.avatarKey && <UserAdminCard
              title="Аватар"
              hint="Можно удалить, если нарушает правила — пользователь получит уведомление"
            >
              <UserAvatarRemoveForm key={user.avatarKey} id={user.id} name={user.name} avatarKey={user.avatarKey} />
            </UserAdminCard> }

            { user.coverKey && <UserAdminCard
              title="Обложка"
              hint="Можно удалить, если нарушает правила — пользователь получит уведомление"
            >
              <UserCoverRemoveForm key={user.coverKey} id={user.id} coverKey={user.coverKey} />
            </UserAdminCard> }
          </div>

          <div className="ui-user-page__column">
            { banned && user.bannedAt ? (
              <UserAdminCard
                title="Блокировка"
                hint={<>
                  Заблокирован <LocalDate value={user.bannedAt} options={{ day: 'numeric', month: 'long', year: 'numeric' }} />
                  { user.bannedUntil ? <> · до <LocalDate value={user.bannedUntil} options={{ day: 'numeric', month: 'long' }} /></> : ' · навсегда' }
                </>}
              >
                <p className="ui-user-card__reason">{ user.banReason }</p>
                { /* key: после смены режима форма не должна унести введённый текст */ }
                <UserBanForm key="unban" user={resource(userBanFormResource, user)} mode="unban" />
              </UserAdminCard>
            ) : (
              <UserAdminCard
                title="Блокировка"
                hint="Заблокированный не может войти, его сессии завершатся сразу. Посты и комментарии остаются"
              >
                <UserBanForm key="ban" user={resource(userBanFormResource, user)} mode="ban" />
              </UserAdminCard>
            ) }

            { log }
          </div>
        </div>
      ) : <>
        <p className="ui-user-page__self">
          <IconInfoCircle size={15} stroke={1.8} />Свои роли, блокировку, аватар и обложку здесь менять нельзя
        </p>
        { log }
      </> }
    </div>
  );
}
