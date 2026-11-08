'use client'

import 'client-only';
import { blockUserAction } from "@/domains/users/actions/userBlockActions";
import { useUserBlock } from "@/domains/users/components/block/userBlockContext";
import { Button, Group, Modal, Text } from "@mantine/core";
import { IconBan } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

/*
  Строка блокировки под шапкой автора и окно подтверждения. «Заблокировать» — пунктом в меню
  «…» (UserBlockMenuItem), окно — здесь: меню при выборе пункта закрывается и размонтируется.
  Строка видна, только когда блокировка уже есть: «Разблокировать» — одним кликом, встречная
  блокировка — его строка, моя кнопка — «Заблокировать в ответ»
*/
export default function UserBlockButton() {
  const { authorId, authorName, state, setState, confirming, setConfirming } = useUserBlock();
  const toggle = useAction(blockUserAction.bind(null, authorId), {
    onSuccess: ({ data }) => { setState(data); setConfirming(false) }
  });

  // Меня заблокировал staff — в ответ нельзя (staff не блокируется), но пояснение нужно
  if(!state || (!state.canBlock && !state.blockedBy)){
    return null;
  }

  return <>
    { (state.blocking || state.blockedBy) && <div className="ui-block">
      { state.blocking && <Text size="sm">{ authorName } в вашем списке блокировок: подписка, сообщения, ответы и комментарии к постам между вами недоступны.</Text> }
      { !state.blocking && state.blockedBy && <Text size="sm" c="dimmed">Вы в списке блокировок пользователя { authorName }: подписка, сообщения и ответы недоступны.</Text> }
      { state.canBlock && state.blocking && <Button size="compact-sm" variant="default" loading={toggle.isPending} onClick={() => toggle.execute({ block: false })}>Разблокировать</Button> }
      { state.canBlock && !state.blocking && state.blockedBy && <Button size="compact-sm" variant="subtle" color="red" leftSection={<IconBan size={14} />} onClick={() => setConfirming(true)}>
        Заблокировать в ответ
      </Button> }
      { toggle.result.serverError && !confirming && <Text size="sm" c="red">{ toggle.result.serverError.message }</Text> }
    </div> }

    <Modal opened={confirming} onClose={() => setConfirming(false)} title={`Заблокировать ${authorName}?`}>
      <Text size="sm" mb="md">
        Подписки между вами снимутся. Подписка, личные сообщения, ответы на комментарии и
        комментарии к постам друг друга станут недоступны, а комментарии и страница этого
        человека у вас будут скрыты. Разблокировать можно в любой момент.
      </Text>
      { toggle.result.serverError && <Text size="sm" c="red" mb="md">{ toggle.result.serverError.message }</Text> }
      <Group justify="flex-end">
        <Button variant="default" onClick={() => setConfirming(false)}>Отмена</Button>
        <Button color="red" loading={toggle.isPending} onClick={() => toggle.execute({ block: true })}>Заблокировать</Button>
      </Group>
    </Modal>
  </>;
}
