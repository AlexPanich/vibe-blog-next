'use client'

import 'client-only';
import { POST_TYPES } from "@/database/schema";
import { PostForm, PostFormState } from "@/domains/posts/hooks/usePostForm";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import { fieldError, FieldErrorProps } from "@/components/general/FieldError";
import { StrictResource } from "@/core/resource";
import TagPicker from "@/domains/tags/exports/TagPicker";
import { TagListResource } from "@/domains/tags/exports/tagResources";
import PostContentEditor from "@/domains/posts/components/editor/PostContentEditor";
import PostLocationPicker from "@/domains/posts/components/map/PostLocationPicker";
import { Input, NumberInput, SegmentedControl, SimpleGrid, Stack, TextInput } from "@mantine/core";

type PostFormFieldsProps<T extends TagListResource> = {
  form: PostForm,
  tagOptions: StrictResource<T, TagListResource>,
  errors?: FieldErrorProps['errors']
}

const typeOptions = POST_TYPES.map(type => ({ value: type, label: POST_TYPE_LABELS[type] }));

export default function PostFormFields<T extends TagListResource>({
  form: { nv, update, data },
  tagOptions,
  errors
}: PostFormFieldsProps<T>) {

  return (
    <>
      <Input.Wrapper label="Тип поста">
        <SegmentedControl
          display="flex"
          mt={4}
          data={typeOptions}
          value={data.type}
          onChange={value => update('type', value as PostFormState['type'])}
        />
      </Input.Wrapper>
      <TextInput
        label="URL (slug)"
        placeholder="my-first-post"
        {...nv('url')}
        onChange={e => update('url', e.target.value)}
        error={fieldError(errors, 'url')}
      />
      <TextInput
        label="Заголовок"
        {...nv('title')}
        onChange={e => update('title', e.target.value)}
        error={fieldError(errors, 'title')}
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
      <PostContentEditor
        value={data.content}
        onChange={value => update('content', value)}
        error={fieldError(errors, 'content')}
      />
      <TagPicker
        options={tagOptions}
        value={data.tagIds}
        onChange={ids => update('tagIds', ids)}
        error={fieldError(errors, 'tagIds')}
      />
    </>
  );
}

// Ошибки details вложенные: { details: { source: { _errors } } }
function detailsError(errors: FieldErrorProps['errors'], field: 'source' | 'lat' | 'lng'){
  const details = errors?.details as Record<string, { _errors?: string[] }> | undefined;

  return details?.[field]?._errors?.[0];
}
