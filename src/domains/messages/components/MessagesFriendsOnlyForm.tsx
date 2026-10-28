'use client'

import 'client-only';
import { updateMessagesFriendsOnlyAction } from "@/domains/messages/actions/messageSettingsActions";
import { Switch, Text } from "@mantine/core";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

// «Только от друзей»: писать могут взаимные подписчики; moderator и admin — всегда.
export default function MessagesFriendsOnlyForm({ friendsOnly: initial }: { friendsOnly: boolean }) {
  const [ friendsOnly, setFriendsOnly ] = useState(initial);
  const action = useAction(updateMessagesFriendsOnlyAction, { onSuccess: ({ data }) => setFriendsOnly(data.friendsOnly) });

  return <>
    <Switch
      label="Принимать сообщения только от друзей"
      description="Друг — тот, с кем вы подписаны друг на друга. Модераторы и администраторы могут написать всегда."
      checked={friendsOnly}
      disabled={action.isPending}
      onChange={e => action.execute({ friendsOnly: e.currentTarget.checked })}
    />
    { action.result.serverError && <Text size="sm" c="red" mt="xs">{ action.result.serverError.message }</Text> }
  </>
}
