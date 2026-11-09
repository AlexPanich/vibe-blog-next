/* Написано руками: ADD COLUMN вместо пересборки posts (на неё ссылаются другие таблицы) */
ALTER TABLE `posts` ADD `submitted_at` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `updated_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `posts` SET `updated_at` = `created_at`;--> statement-breakpoint
UPDATE `posts` SET `submitted_at` = `created_at` WHERE `status` <> 'draft';--> statement-breakpoint
CREATE INDEX `posts_status_submitted_idx` ON `posts` (`status`,`submitted_at`);
