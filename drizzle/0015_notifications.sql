CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`actor_id` integer,
	`post_id` integer,
	`comment_id` integer,
	`role` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "notifications_role" CHECK(("notifications"."type" IN ('user.role_granted', 'user.role_revoked')) = ("notifications"."role" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`,`id`);--> statement-breakpoint
CREATE INDEX `notifications_comment_idx` ON `notifications` (`comment_id`);--> statement-breakpoint
CREATE INDEX `notifications_post_idx` ON `notifications` (`post_id`);--> statement-breakpoint
ALTER TABLE `posts` ADD `announced_at` integer;--> statement-breakpoint
UPDATE `posts` SET `announced_at` = `created_at` WHERE `status` IN ('published', 'hidden', 'blocked') OR `id` IN (SELECT `post_id` FROM `post_moderations` WHERE `decision` = 'approved');
