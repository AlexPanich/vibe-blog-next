'use client'

import 'client-only';
import { ignoreMessagesAction, restrictMessagesAction } from "@/domains/messages/actions/messageSettingsActions";
import { Menu, MenuDropdown, MenuItem, MenuTarget, Text } from "@mantine/core";
import { IconDots, IconEye, IconEyeOff, IconMessageCircle, IconMessageCircleOff } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type MessagePeerMenuProps = {
  peerId: number,
  ignored: boolean,
  restricted: boolean
}

/*
  «…» в шапке диалога: «Скрыть переписку» и «Запретить писать». Без подтверждения — оба
  снимаются тем же пунктом. Список слева перечитывает layout (revalidatePath в action)
*/
export default function MessagePeerMenu({ peerId, ignored: initialIgnored, restricted: initialRestricted }: MessagePeerMenuProps) {
  const [ ignored, setIgnored ] = useState(initialIgnored);
  const [ restricted, setRestricted ] = useState(initialRestricted);
  const ignore = useAction(ignoreMessagesAction.bind(null, peerId), { onSuccess: ({ data }) => setIgnored(data.ignored) });
  const restrict = useAction(restrictMessagesAction.bind(null, peerId), { onSuccess: ({ data }) => setRestricted(data.restricted) });
  const error = ignore.result.serverError ?? restrict.result.serverError;

  return <>
    { error && <Text size="sm" c="red">{ error.message }</Text> }
    <Menu position="bottom-end" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-dialog__icon" aria-label="Ещё" title="Ещё">
          <IconDots size={17} stroke={1.8} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        <MenuItem
          leftSection={ignored ? <IconEye size={16} stroke={1.8} /> : <IconEyeOff size={16} stroke={1.8} />}
          disabled={ignore.isPending}
          onClick={() => ignore.execute({ ignore: !ignored })}
        >
          { ignored ? 'Вернуть в список' : 'Скрыть переписку' }
        </MenuItem>
        <MenuItem
          leftSection={restricted ? <IconMessageCircle size={16} stroke={1.8} /> : <IconMessageCircleOff size={16} stroke={1.8} />}
          disabled={restrict.isPending}
          onClick={() => restrict.execute({ restrict: !restricted })}
        >
          { restricted ? 'Разрешить писать' : 'Запретить писать' }
        </MenuItem>
      </MenuDropdown>
    </Menu>
  </>;
}
