'use client'

import 'client-only';
import { Button, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";

type PostAssistButtonProps = {
  label: string,
  onClick: () => void,
  pending: boolean,
  // Почему кнопка неактивна: подсказка при наведении и aria-label
  disabledReason?: string | null
}

/*
  Кнопка помощника в подписи поля (спека 55, п. 12). Внутри <label> безопасна: клик по
  интерактивному потомку label не активирует. Disabled-кнопка не ловит наведение — тултип на span
*/
export default function PostAssistButton({ label, onClick, pending, disabledReason }: PostAssistButtonProps){
  const button = <Button
    type="button"
    variant="subtle"
    size="compact-xs"
    className="ui-assist-button"
    leftSection={<IconSparkles size={14} />}
    loading={pending}
    disabled={pending || Boolean(disabledReason)}
    aria-label={disabledReason ? `${label}: ${disabledReason}` : undefined}
    onClick={onClick}
  >
    { label }
  </Button>;

  if(!disabledReason){
    return button;
  }

  return <Tooltip label={disabledReason} withArrow>
    <span className="ui-assist-button__wrap">{ button }</span>
  </Tooltip>;
}
