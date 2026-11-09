/*
  Написано руками вместо сгенерированного: drizzle-kit пересобирал users ради CHECK, а
  DROP TABLE users в транзакции миграции падает на внешних ключах (см. 0021_post_lead.sql).
  CHECK на колонке по смыслу равен табличному users_name_genitive_check из schema.ts
*/
ALTER TABLE `users` ADD `cover_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `name_genitive` text CONSTRAINT "users_name_genitive_check" CHECK("name_genitive" IS NULL OR length("name_genitive") BETWEEN 1 AND 40);
