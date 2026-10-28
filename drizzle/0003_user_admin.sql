CREATE TABLE `user_admin_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`action` text NOT NULL,
	`role` text,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_admin_actions_role" CHECK(("user_admin_actions"."action" IN ('role_granted', 'role_revoked')) = ("user_admin_actions"."role" IS NOT NULL)),
	CONSTRAINT "user_admin_actions_ban_comment" CHECK("user_admin_actions"."action" <> 'banned' OR length(trim(coalesce("user_admin_actions"."comment", ''))) > 0)
);
--> statement-breakpoint
CREATE INDEX `user_admin_actions_user_created_idx` ON `user_admin_actions` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `banned_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `ban_reason` text;