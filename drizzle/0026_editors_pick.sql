/*
  Написано руками вместо сгенерированного: drizzle-kit пересобирал posts ради CHECK, а
  DROP TABLE posts в транзакции миграции падает на внешних ключах (см. 0021_post_lead.sql).
  CHECK на колонке по смыслу равен табличному posts_featured_check из schema.ts
*/
ALTER TABLE `posts` ADD `featured_at` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `featured_by` integer REFERENCES users(id) CONSTRAINT "posts_featured_check" CHECK(("featured_at" IS NULL) = ("featured_by" IS NULL));
