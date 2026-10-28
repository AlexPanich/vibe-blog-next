CREATE TABLE `post_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`file_key` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`caption` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_images_file_key_unique` ON `post_images` (`file_key`);--> statement-breakpoint
CREATE INDEX `post_images_post_idx` ON `post_images` (`post_id`);--> statement-breakpoint
ALTER TABLE `comments` ADD `image_id` integer;--> statement-breakpoint
CREATE INDEX `comments_image_idx` ON `comments` (`image_id`);--> statement-breakpoint
ALTER TABLE `posts` ADD `cover_image_id` integer;