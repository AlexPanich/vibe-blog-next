'use client'

import 'client-only';
import { PostForm } from "@/domains/posts/hooks/usePostForm";
import { POST_LEAD_MAX, POST_TITLE_MAX, POST_URL_MAX } from "@/domains/posts/dto/postRequests";
import { fieldError, FieldErrorProps } from "@/components/general/FieldError";
import { StrictResource } from "@/core/resource";
import TagPicker from "@/domains/tags/exports/TagPicker";
import { TagListResource } from "@/domains/tags/exports/tagResources";
import PostContentEditor from "@/domains/posts/components/editor/PostContentEditor";
import PostTypeCards from "@/domains/posts/components/editor/PostTypeCards";
import PostFieldLabel from "@/domains/posts/components/editor/PostFieldLabel";
import PostRouteEditor, { type PostRouteErrors } from "@/domains/posts/components/map/PostRouteEditor";
import { Input, Textarea, TextInput } from "@mantine/core";
import type { PostGalleryResource } from "@/domains/posts/dto/postResources";
import usePostFormAssist from "@/domains/posts/components/assist/usePostFormAssist";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { useRef, type ReactNode } from "react";

type PostFormFieldsProps<T extends TagListResource> = {
  form: PostForm,
  tagOptions: StrictResource<T, TagListResource>,
  errors?: FieldErrorProps['errors'],
  // Поле обложки: у черновика — загрузка в галерею, до первого сохранения — подсказка
  cover: ReactNode,
  // Галерея для фото в тексте (спека 38); нет — пост ещё не сохранён
  postId?: number,
  images?: PostGalleryResource,
  // Помощник автора (спека 55): кнопки в подписях и блоки под полями
  assist: boolean
}

/*
  Поля редактора поста (спека 42): тип карточками, крупный заголовок со счётчиком,
  подзаголовок со счётчиком (спека 35), slug с префиксом, поля типа, рубрики-чипы, обложка, текст
*/
export default function PostFormFields<T extends TagListResource>({
  form,
  tagOptions,
  errors,
  cover,
  postId,
  images,
  assist
}: PostFormFieldsProps<T>) {
  const { nv, update, data } = form;
  // Ref редактора текста: помощник стиля показывает правку через setMarkdown
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const helper = usePostFormAssist(form, assist, editorRef);

  return (
    <>
      <PostTypeCards value={data.type} onChange={type => update('type', type)} />
      <TextInput
        label={<PostFieldLabel hint={`${data.title.length} / ${POST_TITLE_MAX}`} action={helper.title.action}>Заголовок</PostFieldLabel>}
        classNames={{ input: 'ui-title-input' }}
        maxLength={POST_TITLE_MAX}
        placeholder="Короткий и честный"
        {...nv('title')}
        onChange={e => update('title', e.target.value)}
        error={fieldError(errors, 'title')}
      />
      { helper.title.below }
      <Textarea
        label={<PostFieldLabel hint={`${data.lead.length} / ${POST_LEAD_MAX}`} action={helper.lead.action}>Подзаголовок</PostFieldLabel>}
        description="Пара фраз, о чём пост — видно в ленте и в превью ссылки"
        placeholder="Необязательно"
        autosize
        minRows={2}
        maxRows={4}
        maxLength={POST_LEAD_MAX}
        {...nv('lead')}
        onChange={e => update('lead', e.target.value)}
        error={fieldError(errors, 'lead')}
      />
      { helper.lead.below }
      <TextInput
        label="URL (slug)"
        placeholder="my-first-post"
        leftSection={<span className="ui-slug-prefix">/</span>}
        leftSectionWidth={28}
        maxLength={POST_URL_MAX}
        {...nv('url')}
        onChange={e => update('url', e.target.value)}
        error={fieldError(errors, 'url')}
      />
      { data.type === 'translate' && <TextInput
        label="Ссылка на оригинал"
        placeholder="https://…"
        {...nv('source')}
        onChange={e => update('source', e.target.value)}
        error={detailsError(errors, 'source')}
      /> }
      { data.type === 'travel' && <Input.Wrapper label={<PostFieldLabel action={helper.route.action}>Маршрут</PostFieldLabel>}>
        <PostRouteEditor
          points={data.points}
          onChange={points => update('points', points)}
          travelDays={data.travelDays}
          onTravelDays={value => update('travelDays', value)}
          errors={routeErrors(errors)}
        />
        { helper.route.below }
      </Input.Wrapper> }
      <TagPicker
        options={tagOptions}
        value={data.tagIds}
        onChange={ids => update('tagIds', ids)}
        error={fieldError(errors, 'tagIds')}
        labelAction={helper.tags.action}
      />
      { helper.tags.below }
      { cover }
      <PostContentEditor
        value={data.content}
        onChange={value => update('content', value)}
        error={fieldError(errors, 'content')}
        postId={postId}
        images={images}
        editorRef={editorRef}
        footAction={helper.style.action}
        below={helper.style.below}
      />
    </>
  );
}

// Ошибки details вложенные: { details: { source: { _errors } } }
function detailsError(errors: FieldErrorProps['errors'], field: 'source'){
  return detailsErrors(errors)?.[field]?._errors?.[0];
}

/*
  Ошибки маршрута (спека 37): список — details.points._errors, подпись точки —
  details.points[i].label._errors (индекс массива приходит ключом), дни — details.travelDays
*/
function routeErrors(errors: FieldErrorProps['errors']): PostRouteErrors {
  const details = detailsErrors(errors);
  const points = details?.points as Record<string, NestedErrors & { label?: NestedErrors }> & NestedErrors | undefined;
  const labels: (string | undefined)[] = [];

  for(const [ key, value ] of Object.entries(points ?? {})){
    if(/^\d+$/.test(key) && !Array.isArray(value)){
      labels[Number(key)] = value.label?._errors?.[0];
    }
  }

  return {
    points: points?._errors?.[0],
    labels,
    travelDays: details?.travelDays?._errors?.[0]
  };
}

type NestedErrors = { _errors?: string[] }

function detailsErrors(errors: FieldErrorProps['errors']){
  return errors?.details as Record<string, NestedErrors> | undefined;
}
