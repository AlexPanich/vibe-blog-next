ALTER TABLE `posts` RENAME COLUMN `announced_at` TO `published_at`;--> statement-breakpoint
CREATE INDEX `posts_status_published_idx` ON `posts` (`status`,`published_at`);
