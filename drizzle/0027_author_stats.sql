CREATE TABLE `post_view_seen` (
	`post_id` integer NOT NULL,
	`day` text NOT NULL,
	`viewer_hash` text NOT NULL,
	PRIMARY KEY(`post_id`, `day`, `viewer_hash`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `post_view_seen_day_idx` ON `post_view_seen` (`day`);--> statement-breakpoint
CREATE TABLE `post_views_daily` (
	`post_id` integer NOT NULL,
	`day` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`post_id`, `day`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `comments_seen_at` integer;