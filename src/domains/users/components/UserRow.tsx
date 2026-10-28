import LocalDate from "@/components/general/LocalDate";
import type { Role } from "@/database/schema";
import type { User } from "@/database/types";
import UserStatusTags from "@/domains/users/components/UserStatusTags";
import UserAvatar from "@/domains/users/components/UserAvatar";
import { IconArticle, IconCalendar, IconMail } from "@tabler/icons-react";
import Link from "@/components/general/Link";

type UserRowProps = {
  user: Pick<User, 'id' | 'name' | 'email' | 'emailVerified' | 'bannedAt' | 'createdAt' | 'avatarKey'> & { roles: Role[], postsCount: number }
}

// Строка пользователя в списке админки.
export default function UserRow({ user }: UserRowProps) {
  return (
    <Link href={`/office/admin/users/${user.id}`} className="ui-row">
      <UserAvatar name={user.name} avatarKey={user.avatarKey} size={36} />
      <div className="ui-row__body">
        <h3 className="ui-row__title">{ user.name }</h3>
        <div className="ui-meta">
          <span className="ui-meta__item">
            <IconMail size={13} stroke={1.8} />{ user.email }
          </span>
          <span className="ui-meta__item">
            <IconArticle size={13} stroke={1.8} />Постов: { user.postsCount }
          </span>
        </div>
        <div className="ui-meta">
          { user.roles.length > 0
            ? user.roles.map(role => <span key={role} className="ui-tag">{ role }</span>)
            : <span>Без ролей</span> }
        </div>
      </div>
      <div className="ui-row__aside">
        <UserStatusTags user={user} />
        <span className="ui-meta ui-meta__item">
          <IconCalendar size={13} stroke={1.8} />
          <LocalDate value={user.createdAt} options={{ dateStyle: 'medium' }} />
        </span>
      </div>
    </Link>
  );
}
