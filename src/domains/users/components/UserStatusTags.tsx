import type { User } from "@/database/types";

// Бейджи состояния пользователя в админке; у обычного активного — ничего.
export default function UserStatusTags({ user }: { user: Pick<User, 'bannedAt' | 'emailVerified'> }) {
  return <>
    { user.bannedAt && <span className="ui-status" data-status="banned">Заблокирован</span> }
    { !user.emailVerified && <span className="ui-status">Email не подтверждён</span> }
  </>
}
