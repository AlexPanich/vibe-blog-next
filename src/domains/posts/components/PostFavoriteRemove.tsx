'use client'

import 'client-only';
import { togglePostFavoriteAction } from "@/domains/posts/actions/postFavoriteActions";
import { IconBookmarkFilled } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

/*
  «Убрать» под карточкой избранного; список обновляет revalidatePath в action.
  На десктопе — текстом, на телефоне — коралловой закладкой (подпись прячет CSS)
*/
export default function PostFavoriteRemove({ id }: { id: number }) {
  const action = useAction(togglePostFavoriteAction.bind(null, id));

  return (
    <button
      type="button"
      className="ui-fav__remove"
      title="Убрать из избранного"
      disabled={action.isPending}
      onClick={() => action.execute({ favorite: false })}
    >
      <IconBookmarkFilled size={20} aria-hidden />
      <span>Убрать</span>
    </button>
  );
}
