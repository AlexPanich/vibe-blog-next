import OfficeMenu from "@/components/navigation/OfficeMenu";
import { officeMenuResource } from "@/components/navigation/officeMenuResource";
import { resource } from "@/core/resource";
import { countOpenCommentReports, moderateComments } from "@/domains/comments/exports/countOpenCommentReports";
import { countUnreadMessages } from "@/domains/messages/exports/countUnreadMessages";
import { countUnread } from "@/domains/notifications/exports/countUnread";
import { countPendingAuthorRequests, manageUsers } from "@/domains/users/exports/authorRequests";
import { requireAuthUser } from "@/shared/auth";
import type { ReactNode } from "react";

// Рабочий стол кабинета: левое меню и колонка страницы.
export default async function OfficeDesk({ children }: { children: ReactNode }) {
  const user = await requireAuthUser();
  const counts = {
    reports: moderateComments(user) ? await countOpenCommentReports() : 0,
    authorRequests: manageUsers(user) ? countPendingAuthorRequests() : 0,
    messages: countUnreadMessages(user.id),
    notifications: countUnread(user.id)
  };

  return (
    <div className="ui-desk">
      <OfficeMenu menu={resource(officeMenuResource, { ...user, counts })} />
      <div className="ui-desk__main">
        { children }
      </div>
    </div>
  );
}
