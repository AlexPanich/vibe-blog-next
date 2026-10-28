'use client'

import 'client-only';
import type { Post } from "@/database/types";
import { StrictResource } from "@/core/resource";
import { updatePostAction } from "@/domains/posts/actions/postActions";
import { useAction } from "next-safe-action/hooks";
import usePostForm from "@/domains/posts/hooks/usePostForm";
import { PostDetailsResource } from "@/domains/posts/dto/postResources";
import PostFormFields from "@/domains/posts/components/PostFormFields";
import { TagListResource } from "@/domains/tags/exports/tagResources";
import { Button, Stack } from "@mantine/core";

type PostFields = Pick<Post, 'id' | 'url' | 'title' | 'content'> & { tagIds: number[] } & PostDetailsResource

type PostEditFormProps<T extends PostFields, U extends TagListResource> = {
  post: StrictResource<T, PostFields>,
  tags: StrictResource<U, TagListResource>
}

export default function PostEditForm<T extends PostFields, U extends TagListResource>({ post, tags }: PostEditFormProps<T, U>) {
  const { id, ...initial } = post;
  const action = useAction(updatePostAction.bind(null, id));
  const form = usePostForm(initial);

  return (
    <form onSubmit={e => { e.preventDefault(); action.execute(form.payload()) }}>
      <Stack>
        <PostFormFields form={form} tagOptions={tags} errors={action.result.validationErrors} />
        <Button type="submit" size="md" loading={action.isPending} mt="xs" style={{ alignSelf: 'flex-start' }}>
          Сохранить
        </Button>
      </Stack>
    </form>
  );
}
