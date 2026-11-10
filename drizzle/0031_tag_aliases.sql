CREATE TABLE `tag_aliases` (
	`slug` text PRIMARY KEY NOT NULL,
	`tag_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tag_aliases_tag_idx` ON `tag_aliases` (`tag_id`);