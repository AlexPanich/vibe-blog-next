import 'server-only';
import { db } from "@/globals/db";
import { sortTags } from "@/domains/tags/exports/tagNames";

/*
  Все рубрики для формы поста — и пустые тоже: автор вправе поставить свежую рубрику
*/
export async function getTagOptions(){
  return sortTags(await db.query.tags.findMany());
}
