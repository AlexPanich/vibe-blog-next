'use client'

import 'client-only';
import { showToast } from "@/components/general/showToast";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import useLiveEvent from "@/hooks/useLiveEvent";
import useUser from "@/hooks/useUser";
import { usePathname } from "next/navigation";

const PREVIEW_LENGTH = 100;

/*
  Тост входящего личного сообщения (спека 29). Не в переписке с этим человеком — там оно и
  так появляется; на списке диалогов и в других переписках тост есть. Только в видимой вкладке
*/
export default function MessageToasts() {
  const { user } = useUser();
  const pathname = usePathname();

  useLiveEvent('message.created', ({ dialogId, message, sender }) => {
    const href = `/office/messages/${dialogId}`;

    if(!user || message.userId === user.id || pathname === href || document.visibilityState !== 'visible'){
      return;
    }

    showToast({
      id: `message-${message.id}`,
      icon: <UserAvatar name={sender.name} avatarKey={sender.avatarKey} size={32} />,
      title: sender.name,
      text: message.content.length > PREVIEW_LENGTH ? `${message.content.slice(0, PREVIEW_LENGTH).trimEnd()}…` : message.content,
      href
    });
  });

  return null;
}
