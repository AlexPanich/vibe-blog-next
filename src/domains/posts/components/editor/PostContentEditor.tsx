'use client'

import 'client-only';
import PostMarkdown from "@/domains/posts/components/PostMarkdown";
import PostMarkdownField from "@/domains/posts/components/PostMarkdownField";
import PostFieldLabel from "@/domains/posts/components/editor/PostFieldLabel";
import { plainText, readingMinutes } from "@/domains/posts/shared/postText";
import { plural } from "@/core/plural";
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

type Mode = 'text' | 'preview'

/*
  Текст поста (спека 42): рамка с тулбаром, вкладки «Текст / Превью», подвал «N слов · ~M мин
  чтения». Превью — тот же рендер, что на сайте; редактор при этом не размонтируется, только
  прячется — история правок и курсор остаются. Если markdown не разобрался — прежнее поле
*/
export default function PostContentEditor({ value, onChange, error }: PostContentEditorProps) {
  const [ broken, setBroken ] = useState(false);
  const [ mode, setMode ] = useState<Mode>('text');
  const words = plainText(value).split(' ').filter(Boolean).length;

  if(broken){
    return <>
      <div className="ui-note">Текст не открылся в визуальном редакторе — правьте разметку.</div>
      <PostMarkdownField value={value} onChange={onChange} error={error} />
    </>
  }

  return (
    <Input.Wrapper label={<PostFieldLabel hint="Markdown">Текст</PostFieldLabel>} error={error}>
      <div className="ui-md" data-mode={mode} data-error={!!error || undefined}>
        <div className="ui-md__modes" role="tablist" aria-label="Режим текста">
          { ([ [ 'text', 'Текст' ], [ 'preview', 'Превью' ] ] as const).map(([ key, label ]) => (
            <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)}>
              { label }
            </button>
          )) }
        </div>
        <PostEditorView value={value} onChange={onChange} onError={() => setBroken(true)} />
        { mode === 'preview' && <div className="ui-md__preview">
          { value.trim()
            ? <PostMarkdown content={value} />
            : <p className="ui-md__empty">Пока пусто — напишите текст во вкладке «Текст».</p> }
        </div> }
        <div className="ui-md__foot">
          <span>{ words } { plural(words, [ 'слово', 'слова', 'слов' ]) } · ~{ readingMinutes(value) } мин чтения</span>
          <span className="ui-md__foot-hint">Заголовки, списки, цитаты и ссылки — кнопками сверху</span>
        </div>
      </div>
    </Input.Wrapper>
  );
}
