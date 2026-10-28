CREATE TABLE `comment_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` integer,
	`resolution` text,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "comment_reports_resolution" CHECK(("comment_reports"."resolved_at" IS NULL) = ("comment_reports"."resolution" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_reports_comment_user_uq` ON `comment_reports` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `comment_reports_open_idx` ON `comment_reports` (`resolved_at`,`created_at`);