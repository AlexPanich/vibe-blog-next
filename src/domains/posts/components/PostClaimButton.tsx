'use client'

import 'client-only';
import { claimReviewAction } from "@/domains/posts/actions/postReviewActions";
import { showToast } from "@/components/general/showToast";
import { Button } from "@mantine/core";
import { IconHandGrab, IconLock } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

/*
  «Взять на ревью» из очереди (спека 42, шаг 13): берёт пост и открывает его. Если пост
  успели взять, пока очередь была открыта, — тост и свежая очередь
*/
export default function PostClaimButton({ id }: { id: number }) {
  const router = useRouter();
  const claim = useAction(claimReviewAction.bind(null, id), {
    onSuccess: () => router.push(`/office/moderation/posts/${id}`),
    onError: ({ error }) => {
      showToast({
        id: `claim-${id}`,
        icon: <IconLock size={18} stroke={1.8} />,
        title: 'Не получилось взять пост',
        text: error.serverError?.message ?? 'Попробуйте ещё раз',
        href: null
      });
      router.refresh();
    }
  });

  return (
    <Button
      className="ui-ink-button ui-queue-row__action"
      leftSection={<IconHandGrab size={16} stroke={1.8} />}
      loading={claim.isPending || claim.hasSucceeded}
      onClick={() => claim.execute()}
    >
      Взять на ревью
    </Button>
  );
}
