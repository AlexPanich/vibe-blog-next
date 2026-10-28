'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { createPostAction } from "@/domains/posts/actions/postActions";
import usePostForm from "@/domains/posts/hooks/usePostForm";
import PostFormFields from "@/domains/posts/components/PostFormFields";
import { StrictResource } from "@/core/resource";
import { TagListResource } from "@/domains/tags/exports/tagResources";
import { Button, Stack } from "@mantine/core";

export default function PostCreateForm<T extends TagListResource>({ tags }: { tags: StrictResource<T, TagListResource> }) {
  const action = useAction(createPostAction);
  const form = usePostForm({
    url: '',
    title: '',
    content: '',
    tagIds: []
  });

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(form.payload()) }}>
      <Stack>
        <PostFormFields form={form} tagOptions={tags} errors={action.result.validationErrors} />
        <Button type="submit" size="md" loading={action.isPending} mt="xs" style={{ alignSelf: 'flex-start' }}>
          Создать черновик
        </Button>
      </Stack>
    </form>
  );
}
