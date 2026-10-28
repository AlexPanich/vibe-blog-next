import { PostRatingResource } from "@/domains/posts/dto/postResources";
import { formatRating } from "@/domains/posts/shared/formatRating";
import { IconStarFilled } from "@tabler/icons-react";

// Средняя в мета-строке карточки. Без оценок не рисуется: «Нет оценок» на каждой карточке — шум.
export default function PostRatingBadge({ rating }: { rating: PostRatingResource }) {
  if(rating.count === 0 || rating.average === null){
    return null;
  }

  return (
    <span className="ui-meta__item" title={`Средняя оценка, оценок: ${rating.count}`}>
      <IconStarFilled size={13} className="ui-star" />{ formatRating(rating.average) } ({ rating.count })
    </span>
  );
}
