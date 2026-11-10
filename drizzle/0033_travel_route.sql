/*
  Написано руками вместо сгенерированного (как 0009). drizzle-kit пересобирал posts ради
  CHECK на travel_days, но DROP TABLE posts падает на ссылках из других таблиц. Поэтому
  ADD COLUMN с CHECK на колонке — по смыслу равен табличному posts_travel_days_check из
  schema.ts. Нынешняя точка каждого travel-поста переносится как первая точка маршрута
*/
CREATE TABLE `post_route_points` (
	`post_id` integer NOT NULL,
	`position` integer NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`label` text,
	PRIMARY KEY(`post_id`, `position`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_route_points_check" CHECK(
    "post_route_points"."position" BETWEEN 0 AND 19 AND
    "post_route_points"."lat" BETWEEN -90 AND 90 AND "post_route_points"."lng" BETWEEN -180 AND 180 AND
    ("post_route_points"."label" IS NULL OR length("post_route_points"."label") BETWEEN 1 AND 60)
  )
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `travel_days` integer CONSTRAINT "posts_travel_days_check" CHECK("travel_days" IS NULL OR ("type" = 'travel' AND "travel_days" BETWEEN 1 AND 365));--> statement-breakpoint
INSERT INTO `post_route_points` (`post_id`, `position`, `lat`, `lng`, `label`)
  SELECT `id`, 0, `lat`, `lng`, NULL FROM `posts` WHERE `type` = 'travel';
