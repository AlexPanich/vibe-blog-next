CREATE TABLE `tag_follows` (
	`user_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `tag_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tag_follows_tag_idx` ON `tag_follows` (`tag_id`);--> statement-breakpoint
CREATE TABLE `user_follows` (
	`follower_id` integer NOT NULL,
	`following_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`follower_id`, `following_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_follows_not_self" CHECK("user_follows"."follower_id" <> "user_follows"."following_id")
);
--> statement-breakpoint
CREATE INDEX `user_follows_following_idx` ON `user_follows` (`following_id`);