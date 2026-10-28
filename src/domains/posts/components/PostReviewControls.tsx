'use client'

import 'client-only';
import { claimReviewAction, releaseReviewAction, takeoverReviewAction } from "@/domains/posts/actions/postReviewActions";
import LocalDate from "@/components/general/LocalDate";
import { Button, Group, Text } from "@mantine/core";
import { IconEye, IconHandStop, IconLogout2 } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type PostReviewControlsProps = {
  id: number,
  state: 'free' | 'mine' | 'other',
  reviewer?: { name: string, startedAt: Date },
  canTakeover: boolean
}

// Кто ведёт ревью поста. Состояние и права считает страница; страница обновляется сама —
// actions делают revalidatePath.
export default function PostReviewControls({ id, state, reviewer, canTakeover }: PostReviewControlsProps) {
  const claim = useAction(claimReviewAction.bind(null, id));
  const release = useAction(releaseReviewAction.bind(null, id));
  const takeover = useAction(takeoverReviewAction.bind(null, id));
  const error = claim.result.serverError?.message ?? release.result.serverError?.message ?? takeover.result.serverError?.message;

  return (
    <div className="ui-review">
      <Group gap="sm">
        { state === 'free' && <>
          <Text size="sm" c="dimmed">Пост никто не взял на ревью.</Text>
          <Button size="compact-sm" variant="light" leftSection={<IconEye size={14} />} loading={claim.isPending} onClick={() => claim.execute()}>
            Взять на ревью
          </Button>
        </> }
        { state === 'mine' && <>
          <Text size="sm">Ревью ведёте вы — другие модераторы решение принять не могут.</Text>
          <Button size="compact-sm" variant="default" leftSection={<IconLogout2 size={14} />} loading={release.isPending} onClick={() => release.execute()}>
            Отпустить
          </Button>
        </> }
        { state === 'other' && reviewer && <>
          <Text size="sm">
            Ревью ведёт { reviewer.name } с <LocalDate value={reviewer.startedAt} options={{ dateStyle: 'short', timeStyle: 'short' }} />.
          </Text>
          { canTakeover && <Button size="compact-sm" variant="light" color="orange" leftSection={<IconHandStop size={14} />} loading={takeover.isPending} onClick={() => takeover.execute()}>
            Перехватить
          </Button> }
        </> }
      </Group>
      { error && <Text size="sm" c="red" mt={6}>{ error }</Text> }
    </div>
  );
}
