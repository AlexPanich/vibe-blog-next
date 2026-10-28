'use client'

import 'client-only';
import { ignoreMessagesAction, restrictMessagesAction } from "@/domains/messages/actions/messageSettingsActions";
import { Button, Group, Text } from "@mantine/core";
import { IconEye, IconEyeOff, IconMessageCircleOff, IconMessageCircle } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type MessagePeerControlsProps = {
  peerId: number,
  ignored?: boolean,
  restricted?: boolean,
  // Строка списка: только «Скрыть переписку»
  hideOnly?: boolean,
  onIgnored?: (ignored: boolean) => void
}

/*
  «Скрыть переписку» (если ignored передан) и «Запретить писать» — в шапке диалога и на
  странице автора. Без подтверждения: обе снимаются той же кнопкой
*/
export default function MessagePeerControls({ peerId, ignored: initialIgnored, restricted: initialRestricted = false, hideOnly = false, onIgnored }: MessagePeerControlsProps) {
  const [ ignored, setIgnored ] = useState(initialIgnored);
  const [ restricted, setRestricted ] = useState(initialRestricted);
  const ignore = useAction(ignoreMessagesAction.bind(null, peerId), {
    onSuccess: ({ data }) => {
      setIgnored(data.ignored);
      onIgnored?.(data.ignored);
    }
  });
  const restrict = useAction(restrictMessagesAction.bind(null, peerId), { onSuccess: ({ data }) => setRestricted(data.restricted) });
  const error = ignore.result.serverError ?? restrict.result.serverError;

  return (
    <Group gap="xs">
      { ignored !== undefined && <Button
        size="compact-sm"
        variant="default"
        leftSection={ignored ? <IconEye size={15} /> : <IconEyeOff size={15} />}
        loading={ignore.isPending}
        onClick={() => ignore.execute({ ignore: !ignored })}
      >
        { ignored ? 'Вернуть в список' : 'Скрыть переписку' }
      </Button> }
      { !hideOnly && <Button
        size="compact-sm"
        variant={restricted ? 'light' : 'default'}
        color={restricted ? 'red' : undefined}
        leftSection={restricted ? <IconMessageCircle size={15} /> : <IconMessageCircleOff size={15} />}
        loading={restrict.isPending}
        onClick={() => restrict.execute({ restrict: !restricted })}
      >
        { restricted ? 'Разрешить писать' : 'Запретить писать' }
      </Button> }
      { error && <Text size="sm" c="red">{ error.message }</Text> }
    </Group>
  );
}
