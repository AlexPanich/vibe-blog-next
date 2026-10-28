'use client'

import 'client-only';
import PostMarkdownField from "@/domains/posts/components/PostMarkdownField";
import { Input } from "@mantine/core";
import dynamic from "next/dynamic";
import { useState } from "react";

const PostEditorView = dynamic(() => import('@/domains/posts/components/editor/PostEditorView'), {
  ssr: false,
  // Заглушка той же высоты: форма не прыгает, когда редактор догрузится
  loading: () => <div className="ui-editor ui-editor--loading" />
});

type PostContentEditorProps = {
  value: string,
  onChange: (value: string) => void,
  error?: string
}

// Текст поста: визуальный редактор, а если он не разобрал markdown — прежнее поле с предпросмотром.
export default function PostContentEditor({ value, onChange, error }: PostContentEditorProps) {
  const [ broken, setBroken ] = useState(false);

  if(broken){
    return <>
      <div className="ui-note">Текст не открылся в визуальном редакторе — правьте разметку.</div>
      <PostMarkdownField value={value} onChange={onChange} error={error} />
    </>
  }

  return (
    <Input.Wrapper label="Текст" error={error}>
      <div className="ui-editor-wrap" data-error={!!error || undefined}>
        <PostEditorView value={value} onChange={onChange} onError={() => setBroken(true)} />
      </div>
    </Input.Wrapper>
  );
}
