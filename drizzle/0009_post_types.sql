/*
  Написано руками вместо сгенерированного. drizzle-kit пересобирал posts (CHECK в SQLite
  иначе не добавить), но миграция идёт в транзакции, где PRAGMA foreign_keys=OFF не
  действует: DROP TABLE posts падает на ссылках из post_tags, post_ratings и прочих.
  Поэтому ADD COLUMN, а CHECK — на последней колонке: в SQLite он может ссылаться на
  соседние колонки и по смыслу равен табличному posts_type_fields_check из schema.ts
*/
ALTER TABLE `posts` ADD `type` text DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `source` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `posts` ADD `lng` real CONSTRAINT "posts_type_fields_check" CHECK(
    ("type" = 'simple' AND "source" IS NULL AND "lat" IS NULL AND "lng" IS NULL) OR
    ("type" = 'translate' AND "source" IS NOT NULL AND "lat" IS NULL AND "lng" IS NULL) OR
    ("type" = 'travel' AND "source" IS NULL AND "lat" IS NOT NULL AND "lng" IS NOT NULL)
  );--> statement-breakpoint
CREATE INDEX `posts_type_idx` ON `posts` (`type`);
