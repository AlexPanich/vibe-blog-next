import LocalDate from "@/components/general/LocalDate";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import type { PostType } from "@/database/schema";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import PostAuthorGate from "@/domains/posts/components/PostAuthorGate";
import { IconArrowRight } from "@tabler/icons-react";
import Link from "@/components/general/Link";

type Move = {
  id: number,
  move: number,
  title: string,
  type: PostType,
  publishedAt: Date | null,
  authorId: number,
  authorName: string,
  authorAvatarKey: string | null
}

type HomeScoreSheetProps = {
  moves: Move[],
  nextMove: number
}

/*
  Бланк партии: публикации записаны как ходы, по порядку, с настоящими номерами. Последняя
  строка пустая — номер следующей публикации. Автору она ведёт к новому посту; остальным
  (гостю и вошедшему без роли author) — просто строка: создание дало бы 403
*/
export default function HomeScoreSheet({ moves, nextMove }: HomeScoreSheetProps) {
  return (
    <aside className="ui-sheet" aria-label="Последние публикации">
      <div className="ui-sheet__head">
        <span className="ui-kicker">Бланк партии</span>
        <span className="ui-sheet__total">Публикаций: { nextMove - 1 }</span>
      </div>

      <ol className="ui-sheet__moves">
        { moves.map(move => (
          <li key={move.id} className="ui-sheet__move">
            <span className="ui-sheet__no">{ move.move }.</span>
            <div className="ui-sheet__body">
              <Link href={`/posts/${move.id}`} className="ui-sheet__title">{ move.title }</Link>
              <span className="ui-sheet__meta">
                <Link href={`/authors/${move.authorId}`} className="ui-sheet__author">
                  <UserAvatar name={move.authorName} avatarKey={move.authorAvatarKey} size={18} />{ move.authorName }
                </Link>
                { move.type !== 'simple' && <span>{ POST_TYPE_LABELS[move.type] }</span> }
                { move.publishedAt && <LocalDate value={move.publishedAt} relative /> }
              </span>
            </div>
          </li>
        )) }
      </ol>

      <PostAuthorGate
        fallback={<div className="ui-sheet__next ui-sheet__next--static">
          <span className="ui-sheet__no">{ nextMove }.</span>
        </div>}
        author={<Link href="/office/posts/create" className="ui-sheet__next">
          <span className="ui-sheet__no">{ nextMove }.</span>
          <span className="ui-sheet__blank">Ход за вами</span>
          <IconArrowRight size={16} aria-hidden />
        </Link>}
        other={<div className="ui-sheet__next ui-sheet__next--static">
          <span className="ui-sheet__no">{ nextMove }.</span>
          <span className="ui-sheet__wait">Следующий ход — за авторами</span>
        </div>}
      />
    </aside>
  );
}
