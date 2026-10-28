import { authorRequests, commentReports, comments, dialogs, messages, notifications, postImages, postModerations, posts, tags, userAdminActions, users } from './schema';

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostModeration = typeof postModerations.$inferSelect;
export type UserAdminAction = typeof userAdminActions.$inferSelect;
export type AuthorRequest = typeof authorRequests.$inferSelect;

export type Tag = typeof tags.$inferSelect;

export type Comment = typeof comments.$inferSelect;
export type PostImage = typeof postImages.$inferSelect;
export type CommentReport = typeof commentReports.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Dialog = typeof dialogs.$inferSelect;
export type Message = typeof messages.$inferSelect;
