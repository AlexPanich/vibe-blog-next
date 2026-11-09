'use client'

import 'client-only';
import type { Post } from "@/database/types";
import { StrictResource } from "@/core/resource";
import { createPostAction, updatePostAction } from "@/domains/posts/actions/postActions";
import usePostForm from "@/domains/posts/hooks/usePostForm";
import { PostDetailsResource } from "@/domains/posts/dto/postResources";
import PostFormFields from "@/domains/posts/components/PostFormFields";
import PostPublishCard, { type PostEditorIntent } from "@/domains/posts/components/editor/PostPublishCard";
import PostEditorTips from "@/domains/posts/components/editor/PostEditorTips";
import { TagListResource } from "@/domains/tags/exports/tagResources";
import { Button } from "@mantine/core";
import { IconCircleCheck, IconSend } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useState, type ReactNode } from "react";

type PostFields = Pick<Post, 'id' | 'url' | 'title' | 'lead' | 'content'> & { tagIds: number[] } & PostDetailsResource

type PostEditorFormProps<T extends PostFields, U extends TagListResource> = {
  // Нет поста — создание
  post?: StrictResource<T, PostFields>,
  tags: StrictResource<U, TagListResource>,
  // Шапка: хлебные крошки и заголовок страницы
  head: ReactNode,
  cover: ReactNode,
  // Карточка «Фото к посту» в правой колонке
  photos: ReactNode
}

const EMPTY = { url: '', title: '', lead: '', content: '', tagIds: [] }

/*
  Редактор поста (спека 42): поля слева, справа карточка публикации, подсказки и фото.
  Обе кнопки — один action с флагом submit. Новый черновик после сохранения открывается в
  редакторе, сохранённый остаётся на месте и показывает время; отправленный уходит на
  карточку поста. На телефоне кнопки — в закреплённой снизу панели
*/
export default function PostEditorForm<T extends PostFields, U extends TagListResource>({
  post,
  tags,
  head,
  cover,
  photos
}: PostEditorFormProps<T, U>) {
  const create = useAction(createPostAction);
  const update = useAction(updatePostAction.bind(null, post?.id ?? 0));
  const action = post ? update : create;
  const form = usePostForm(post ?? EMPTY);
  const [ intent, setIntent ] = useState<PostEditorIntent>('save');
  const pending = action.isPending ? intent : null;
  const savedAt = post ? update.result.data?.savedAt : undefined;

  function send(next: PostEditorIntent){
    setIntent(next);
    action.execute({ ...form.payload(), submit: next === 'submit' });
  }

  return (
    <form className="ui-post-editor" onSubmit={e => { e.preventDefault(); send('save') }}>
      <div className="ui-post-editor__head">
        <div>{ head }</div>
        { savedAt && !update.isPending && <p className="ui-post-editor__saved">
          <IconCircleCheck size={16} stroke={2} />
          Черновик сохранён в { savedAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }
        </p> }
      </div>

      <div className="ui-post-editor__columns">
        <div className="ui-post-editor__fields">
          <PostFormFields form={form} tagOptions={tags} errors={action.result.validationErrors} cover={cover} />
        </div>

        <aside className="ui-post-editor__aside">
          <PostPublishCard pending={pending} error={action.result.serverError?.message} onSubmit={() => send('submit')} />
          <PostEditorTips />
          { photos }
        </aside>
      </div>

      <div className="ui-post-editor__bar">
        { action.result.serverError && <p className="ui-post-editor__bar-error" role="alert">{ action.result.serverError.message }</p> }
        <Button type="submit" variant="default" loading={pending === 'save'} disabled={pending === 'submit'}>
          Сохранить
        </Button>
        <Button
          type="button"
          leftSection={<IconSend size={15} />}
          loading={pending === 'submit'}
          disabled={pending === 'save'}
          onClick={() => send('submit')}
        >
          На проверку
        </Button>
      </div>
    </form>
  );
}
