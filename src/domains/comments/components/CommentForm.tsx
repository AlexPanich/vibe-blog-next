'use client'

import 'client-only';
import { createCommentAction, updateCommentAction } from "@/domains/comments/actions/commentActions";
import { COMMENT_MAX } from "@/domains/comments/dto/commentRequests";
import { fieldError } from "@/components/general/FieldError";
import UserAvatar from "@/domains/users/exports/UserAvatar";
import { Button, Group, Text, Textarea } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type CommentFormProps = {
  // Новый комментарий или ответ — postId (+ parentId), правка — id и текущий текст
  target: { postId: number, imageId: number | null, parentId?: number } | { id: number, content: string },
  submitLabel: string,
  placeholder?: string,
  autoFocus?: boolean,
  onDone?: () => void,
  onCancel?: () => void,
  // Новый комментарий под постом (спека 30): одна строка в рамке, аватар автора и круглая
  // кнопка отправки. Поле ищет по id нижняя панель телефона (PostActions)
  composer?: { name: string, avatarKey: string | null }
}

// Форма текста комментария: новый, ответ и правка.
export default function CommentForm({ target, submitLabel, placeholder, autoFocus, onDone, onCancel, composer }: CommentFormProps) {
  const editing = 'id' in target;
  const [ content, setContent ] = useState(editing ? target.content : '');
  const create = useAction(createCommentAction.bind(null, editing ? 0 : target.postId, editing ? null : target.imageId), {
    onSuccess: () => { setContent(''); onDone?.() }
  });
  const update = useAction(updateCommentAction.bind(null, editing ? target.id : 0), {
    onSuccess: () => onDone?.()
  });
  const action = editing ? update : create;

  function submit(){
    if(editing){
      update.execute({ content });
    }
    else{
      create.execute({ content, parentId: target.parentId });
    }
  }

  const contentError = fieldError(action.result.validationErrors, 'content');

  if(composer){
    return (
      <form id="comment-composer" className="ui-comment-composer" onSubmit={e => { e.preventDefault(); submit() }}>
        <div className="ui-comment-composer__box">
          <UserAvatar name={composer.name} avatarKey={composer.avatarKey} size={36} />
          <Textarea
            className="ui-comment-composer__field"
            variant="unstyled"
            aria-label={placeholder ?? 'Комментарий'}
            placeholder={placeholder}
            autosize
            minRows={1}
            maxLength={COMMENT_MAX}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              // Ctrl/⌘+Enter — отправить, просто Enter — новая строка
              if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
                e.preventDefault();
                submit();
              }
            }}
          />
          <button type="submit" className="ui-comment-composer__send" aria-label={submitLabel} disabled={action.isPending || content.trim() === ''}>
            <IconArrowUp size={18} stroke={2.2} />
          </button>
        </div>
        { contentError && <Text size="sm" c="red">{ contentError }</Text> }
        { action.result.serverError && <Text size="sm" c="red">{ action.result.serverError.message }</Text> }
      </form>
    );
  }

  return (
    <form className="ui-comment-form" onSubmit={e => { e.preventDefault(); submit() }}>
      <Textarea
        aria-label={placeholder ?? 'Комментарий'}
        placeholder={placeholder}
        autosize
        minRows={2}
        maxLength={COMMENT_MAX}
        autoFocus={autoFocus}
        value={content}
        onChange={e => setContent(e.target.value)}
        error={contentError}
      />
      { action.result.serverError && <Text size="sm" c="red">{ action.result.serverError.message }</Text> }
      <Group gap="xs">
        <Button type="submit" size="compact-sm" loading={action.isPending} disabled={content.trim() === ''}>
          { submitLabel }
        </Button>
        { onCancel && <Button size="compact-sm" variant="subtle" color="gray" onClick={onCancel}>Отмена</Button> }
      </Group>
    </form>
  );
}
