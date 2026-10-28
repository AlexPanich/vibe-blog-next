import { CONTAINER } from "@/globals/container";
import { db } from "@/globals/db";
import { userAdminActions, users } from "@/database/schema";
import { manageUser, manageUsers } from "@/domains/users/policy";
import UserStatusTags from "@/domains/users/components/UserStatusTags";
import UserRolesForm from "@/domains/users/components/UserRolesForm";
import UserBanForm from "@/domains/users/components/UserBanForm";
import UserAdminHistory from "@/domains/users/components/UserAdminHistory";
import UserAvatar from "@/domains/users/components/UserAvatar";
import UserAvatarRemoveForm from "@/domains/users/components/UserAvatarRemoveForm";
import { userBanFormResource, userRolesFormResource } from "@/domains/users/dto/userResources";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { resource } from "@/core/resource";
import { requireAuthUser } from "@/shared/auth";
import { idOrFail } from "@/shared/params";
import LocalDate from "@/components/general/LocalDate";
import { desc, eq } from "drizzle-orm";
import Link from "@/components/general/Link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconCalendar, IconExternalLink, IconMail } from "@tabler/icons-react";

export default async function AdminUsersItem({ params }: PageProps<'/office/admin/users/[id]'>) {
  const id = idOrFail((await params).id);
  await CONTAINER.boucerService.breakIfCant(manageUsers);

  const me = await requireAuthUser();
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      adminActions: {
        orderBy: desc(userAdminActions.id),
        with: { actor: true }
      }
    }
  });

  if(!user){
    return notFound();
  }

  const roles = parseRoles(user.roles);

  return (
    <article className="ui-article">
      <Link href={user.bannedAt ? '/office/admin/users?filter=banned' : '/office/admin/users'} className="ui-backlink">
        <IconArrowLeft size={15} />Пользователи
      </Link>

      <div className="ui-profile">
        <UserAvatar name={user.name} avatarKey={user.avatarKey} size={72} />
        <h1 className="ui-title ui-title--lg">{ user.name }</h1>
      </div>

      <div className="ui-meta">
        <UserStatusTags user={user} />
        <span className="ui-meta__item">
          <IconMail size={14} stroke={1.8} />{ user.email }
        </span>
        <span className="ui-meta__item">
          <IconCalendar size={14} stroke={1.8} />
          <LocalDate value={user.createdAt} />
        </span>
        <Link href={`/authors/${user.id}`} className="ui-meta__item">
          <IconExternalLink size={14} stroke={1.8} />Страница автора
        </Link>
      </div>

      { user.bannedAt && <div className="ui-note ui-note--danger">
        <span className="ui-note__label">
          Заблокирован · <LocalDate value={user.bannedAt} />
        </span>
        { user.banReason }
      </div> }

      { manageUser(me, user) ? <>
        <div className="ui-actions">
          <div style={{ flex: 1 }}>
            <p className="ui-kicker">Роли</p>
            <UserRolesForm key={roles.join()} user={resource(userRolesFormResource, { id: user.id, roles })} />
          </div>
        </div>

        <div className="ui-actions">
          <div style={{ flex: 1 }}>
            <p className="ui-kicker">Блокировка</p>
            { /* key: после смены режима форма не должна унести введённый текст */ }
            { user.bannedAt
              ? <UserBanForm key="unban" user={resource(userBanFormResource, user)} mode="unban" />
              : <UserBanForm key="ban" user={resource(userBanFormResource, user)} mode="ban" /> }
          </div>
        </div>

        { user.avatarKey && <div className="ui-actions">
          <div style={{ flex: 1 }}>
            <p className="ui-kicker">Аватар</p>
            <UserAvatarRemoveForm key={user.avatarKey} id={user.id} name={user.name} avatarKey={user.avatarKey} />
          </div>
        </div> }
      </> : (
        <div className="ui-note">Свои роли, блокировку и аватар здесь менять нельзя.</div>
      ) }

      <div className="ui-actions">
        <div style={{ flex: 1 }}>
          <p className="ui-kicker">Журнал</p>
          <UserAdminHistory actions={user.adminActions} />
        </div>
      </div>
    </article>
  );
}
