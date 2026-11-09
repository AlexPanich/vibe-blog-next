/* Написано руками: ADD COLUMN вместо пересборки users (на неё ссылаются другие таблицы) */
ALTER TABLE `users` ADD `gender` text CHECK (`gender` IS NULL OR `gender` IN ('m', 'f'));--> statement-breakpoint
ALTER TABLE `notifications` ADD `group_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE TABLE `notification_throttles` (
	`actor_id` integer NOT NULL,
	`kind` text NOT NULL,
	`target_id` integer NOT NULL,
	`notified_at` integer NOT NULL,
	PRIMARY KEY(`actor_id`, `kind`, `target_id`),
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "notification_throttles_kind" CHECK("notification_throttles"."kind" IN ('rate', 'follow'))
);
