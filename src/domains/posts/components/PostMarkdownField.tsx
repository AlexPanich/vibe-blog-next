'use client'

import 'client-only';
import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import type { PostGalleryResource } from "@/domains/posts/dto/postResources";
import { Input, Tabs, Text, Textarea } from "@mantine/core";

type PostMarkdownFieldProps = {
  value: string,
  onChange: (value: string) => void,
  error?: string,
  // Галерея поста: фото в тексте видны в предпросмотре (спека 38)
  postId?: number,
  images?: PostGalleryResource
}

// Текст поста в markdown: вкладка с полем и вкладка с предпросмотром тем же рендером, что на сайте.
export default function PostMarkdownField({ value, onChange, error, postId, images }: PostMarkdownFieldProps) {
  return (
    <Input.Wrapper label="Текст" error={error} description="Markdown: **жирный**, *курсив*, # заголовок, - список, > цитата, [ссылка](https://…), `код`">
      <Tabs defaultValue="write" mt={6} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="write">Текст</Tabs.Tab>
          <Tabs.Tab value="preview">Предпросмотр</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="write" pt="xs">
          <Textarea
            name="content"
            aria-label="Текст"
            autosize
            minRows={8}
            value={value}
            onChange={e => onChange(e.target.value)}
            error={!!error}
          />
        </Tabs.Panel>
        <Tabs.Panel value="preview" pt="xs">
          { value.trim()
            ? <div className="ui-preview"><PostMarkdown content={value} photos={postId && images ? { postId, images } : undefined} /></div>
            : <Text size="sm" c="dimmed">Пока пусто — напишите текст во вкладке «Текст».</Text> }
        </Tabs.Panel>
      </Tabs>
    </Input.Wrapper>
  );
}
