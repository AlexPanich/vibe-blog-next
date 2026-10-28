'use client'

import 'client-only';
import { reactCommentAction } from "@/domains/comments/actions/commentActions";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { IconThumbDown, IconThumbDownFilled, IconThumbUp, IconThumbUpFilled } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type CommentReactionsProps = {
  id: number,
  likes: number,
  dislikes: number,
  mine: 1 | -1 | undefined,
  // Гостю, на своём и на скрытом — только счётчики
  canReact: boolean,
  onReacted: (mine: 1 | -1 | 0) => void
}

// Лайк / дизлайк. Повторный клик снимает свою реакцию, другой — переключает.
export default function CommentReactions({ id, likes, dislikes, mine, canReact, onReacted }: CommentReactionsProps) {
  const react = useAction(reactCommentAction.bind(null, id), { onSuccess: ({ data }) => onReacted(data.mine) });
  const press = (value: 1 | -1) => react.execute({ value: mine === value ? 0 : value });

  return (
    <Group gap={10} className="ui-reactions">
      <Reaction label="Нравится" count={likes} active={mine === 1} icon={mine === 1 ? IconThumbUpFilled : IconThumbUp} onPress={canReact && !react.isPending ? () => press(1) : undefined} />
      <Reaction label="Не нравится" count={dislikes} active={mine === -1} icon={mine === -1 ? IconThumbDownFilled : IconThumbDown} onPress={canReact && !react.isPending ? () => press(-1) : undefined} />
      { react.result.serverError && <Text size="xs" c="red">{ react.result.serverError.message }</Text> }
    </Group>
  );
}

type ReactionProps = {
  label: string,
  count: number,
  active: boolean,
  icon: typeof IconThumbUp,
  onPress?: () => void
}

function Reaction({ label, count, active, icon: Icon, onPress }: ReactionProps){
  const body = <><Icon size={15} stroke={1.8} /><span>{ count }</span></>;

  if(!onPress){
    return <span className="ui-reaction" aria-label={`${label}: ${count}`}>{ body }</span>
  }

  return (
    <UnstyledButton className="ui-reaction" data-active={active || undefined} aria-pressed={active} aria-label={`${label}: ${count}`} onClick={onPress}>
      { body }
    </UnstyledButton>
  );
}
