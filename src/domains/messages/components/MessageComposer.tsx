'use client'

import 'client-only';
import { sendMessageAction } from "@/domains/messages/actions/messageActions";
import { MESSAGE_MAX } from "@/domains/messages/dto/messageRequests";
import type { MessageItemResource } from "@/domains/messages/dto/messageResources";
import { fieldError } from "@/components/general/FieldError";
import { ActionIcon, Text, Textarea } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type MessageComposerProps = {
  recipientId: number,
  onSent: (sent: { dialogId: number, message: MessageItemResource }) => void
}

// Поле ввода внизу диалога: Enter — отправить, Shift+Enter — перенос строки.
export default function MessageComposer({ recipientId, onSent }: MessageComposerProps) {
  const [ content, setContent ] = useState('');
  const send = useAction(sendMessageAction.bind(null, recipientId), {
    onSuccess: ({ data }) => {
      setContent('');
      onSent(data);
    }
  });

  function submit(){
    if(content.trim() !== '' && !send.isPending){
      send.execute({ content });
    }
  }

  return (
    <form className="ui-composer" onSubmit={e => { e.preventDefault(); submit() }}>
      <Textarea
        className="ui-composer__field"
        aria-label="Сообщение"
        placeholder="Сообщение… Enter — отправить, Shift+Enter — перенос"
        autosize
        minRows={1}
        maxRows={8}
        maxLength={MESSAGE_MAX}
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={e => {
          if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing){
            e.preventDefault();
            submit();
          }
        }}
        error={fieldError(send.result.validationErrors, 'content')}
      />
      <ActionIcon type="submit" size="lg" aria-label="Отправить" loading={send.isPending} disabled={content.trim() === ''}>
        <IconSend size={18} />
      </ActionIcon>
      { send.result.serverError && <Text size="sm" c="red" className="ui-composer__error">{ send.result.serverError.message }</Text> }
    </form>
  );
}
