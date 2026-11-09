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
import PostLocationPicker from "@/domains/posts/components/map/PostLocationPicker";
import { Input, NumberInput, SimpleGrid, Stack, Textarea, TextInput } from "@mantine/core";
import type { ReactNode } from "react";

type PostFormFieldsProps<T extends TagListResource> = {
  form: PostForm,
  tagOptions: StrictResource<T, TagListResource>,
  errors?: FieldErrorProps['errors'],
  // Поле обложки: у черновика — загрузка в галерею, до первого сохранения — подсказка
  cover: ReactNode
}

/*
  Поля редактора поста (спека 42): тип карточками, крупный заголовок со счётчиком,
  подзаголовок со счётчиком (спека 35), slug с префиксом, поля типа, рубрики-чипы, обложка, текст
*/
export default function PostFormFields<T extends TagListResource>({
  form: { nv, update, data },
  tagOptions,
  errors,
  cover
}: PostFormFieldsProps<T>) {

  return (
    <>
      <PostTypeCards value={data.type} onChange={type => update('type', type)} />
      <TextInput
        label={<PostFieldLabel hint={`${data.title.length} / ${POST_TITLE_MAX}`}>Заголовок</PostFieldLabel>}
        classNames={{ input: 'ui-title-input' }}
        maxLength={POST_TITLE_MAX}
        placeholder="Короткий и честный"
        {...nv('title')}
        onChange={e => update('title', e.target.value)}
        error={fieldError(errors, 'title')}
      />
      <Textarea
        label={<PostFieldLabel hint={`${data.lead.length} / ${POST_LEAD_MAX}`}>Подзаголовок</PostFieldLabel>}
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
      { data.type === 'travel' && <Input.Wrapper label="Место" description="Кликните по карте или введите координаты">
        <Stack gap="xs" mt={6}>
          <SimpleGrid cols={2} spacing="sm">
            <NumberInput
              aria-label="Широта"
              placeholder="Широта"
              decimalScale={6}
              min={-90}
              max={90}
              {...nv('lat')}
              onChange={value => update('lat', value)}
              error={detailsError(errors, 'lat')}
            />
            <NumberInput
              aria-label="Долгота"
              placeholder="Долгота"
              decimalScale={6}
              min={-180}
              max={180}
              {...nv('lng')}
              onChange={value => update('lng', value)}
              error={detailsError(errors, 'lng')}
            />
          </SimpleGrid>
          <PostLocationPicker
            lat={data.lat}
            lng={data.lng}
            onChange={(lat, lng) => { update('lat', lat); update('lng', lng) }}
          />
        </Stack>
      </Input.Wrapper> }
      <TagPicker
        options={tagOptions}
        value={data.tagIds}
        onChange={ids => update('tagIds', ids)}
        error={fieldError(errors, 'tagIds')}
      />
      { cover }
      <PostContentEditor
        value={data.content}
        onChange={value => update('content', value)}
        error={fieldError(errors, 'content')}
      />
    </>
  );
}

// Ошибки details вложенные: { details: { source: { _errors } } }
function detailsError(errors: FieldErrorProps['errors'], field: 'source' | 'lat' | 'lng'){
  const details = errors?.details as Record<string, { _errors?: string[] }> | undefined;

  return details?.[field]?._errors?.[0];
}
