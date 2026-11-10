import type { PostDetailsDto } from "@/domains/posts/dto/postRequests";

/*
  Поля типа в колонки. Чужие для типа поля явно обнуляются — смена типа в черновике
  стирает их, иначе posts_type_fields_check отклонит запись
*/
export function postDetailsColumns(details: PostDetailsDto){
  return {
    type: details.type,
    source: details.type === 'translate' ? details.source : null,
    // У travel — первая точка маршрута, остальные в post_route_points (спека 37)
    lat: details.type === 'travel' ? details.points[0].lat : null,
    lng: details.type === 'travel' ? details.points[0].lng : null,
    travelDays: details.type === 'travel' ? details.travelDays : null
  }
}
