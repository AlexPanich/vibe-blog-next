import 'server-only';
import { officeMenuResource } from "@/components/navigation/officeMenuResource";
import { resource } from "@/core/resource";
import { countOpenCommentReports, moderateComments } from "@/domains/comments/exports/countOpenCommentReports";
import { countUnreadMessages } from "@/domains/messages/exports/countUnreadMessages";
import { countUnread } from "@/domains/notifications/exports/countUnread";
import { countModeratingPosts, moderatePosts } from "@/domains/posts/exports/countModeratingPosts";
import { countPendingAuthorRequests, manageUsers } from "@/domains/users/exports/authorRequests";
import { requireAuthUser } from "@/shared/auth";
import { cache } from "react";

/*
  Меню кабинета: левая колонка (OfficeDesk) и чипы разделов на «Начале» на телефоне.
  cache — оба места в одном запросе считают бейджи один раз
*/
export const getOfficeMenu = cache(async () => {
  const user = await requireAuthUser();
  const counts = {
    moderating: moderatePosts(user) ? await countModeratingPosts() : 0,
    reports: moderateComments(user) ? await countOpenCommentReports() : 0,
    authorRequests: manageUsers(user) ? countPendingAuthorRequests() : 0,
    messages: countUnreadMessages(user.id),
    notifications: countUnread(user.id)
  };

  return resource(officeMenuResource, { ...user, counts });
});
