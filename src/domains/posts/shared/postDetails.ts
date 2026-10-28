import type { PostDetailsDto } from "@/domains/posts/dto/postRequests";

/*
  Поля типа в колонки. Чужие для типа поля явно обнуляются — смена типа в черновике
  стирает их, иначе posts_type_fields_check отклонит запись
*/
export function postDetailsColumns(details: PostDetailsDto){
  return {
    type: details.type,
    source: details.type === 'translate' ? details.source : null,
    lat: details.type === 'travel' ? details.lat : null,
    lng: details.type === 'travel' ? details.lng : null
  }
}
