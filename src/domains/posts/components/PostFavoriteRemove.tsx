'use client'

import 'client-only';
import { togglePostFavoriteAction } from "@/domains/posts/actions/postFavoriteActions";
import { Button } from "@mantine/core";
import { IconBookmarkOff } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

// «Убрать» в списке избранного; список обновляет revalidatePath в action.
export default function PostFavoriteRemove({ id }: { id: number }) {
  const action = useAction(togglePostFavoriteAction.bind(null, id));

  return (
    <Button size="compact-sm" variant="default" leftSection={<IconBookmarkOff size={14} />} loading={action.isPending} onClick={() => action.execute({ favorite: false })}>
      Убрать
    </Button>
  );
}
