import { stripMarkdown } from "@/core/markdown";
import type { PostType } from "@/database/schema";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";

type PostOgImageProps = {
  // Обложка data URL (png 480×630) — справа от текста
  cover: string | null,
  type: PostType,
  title: string,
  content: string,
  author: string,
  tags: string[]
}

/*
  Разметка превью ссылки 1200×630 для next/og. Satori не знает CSS-переменных и наших классов,
  поэтому цвета заданы прямо — тёмная палитра из tokens.css. Шрифт — Geist из комплекта
  next/og: кириллица в нём есть, жирного начертания нет
*/
export default function PostOgImage({ cover, type, title, content, author, tags }: PostOgImageProps) {
  const excerpt = stripMarkdown(content);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0b1110', color: '#e9ecef', fontFamily: 'Geist', borderTop: '14px solid #3ebf6e' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 32, color: '#3ebf6e' }}>
          <span style={{ color: '#e9ecef', fontWeight: 700 }}>Vibe.</span>
          <span style={{ fontSize: 22, letterSpacing: 4, color: '#8a948f' }}>ХОД ЗА ТОБОЙ</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          { type !== 'simple' && <span style={{ fontSize: 26, letterSpacing: 3, color: '#3ebf6e' }}>{ POST_TYPE_LABELS[type].toUpperCase() }</span> }
          <div style={{ fontSize: title.length > 40 ? 60 : 76, fontWeight: 700, lineHeight: 1.1 }}>{ title }</div>
          { excerpt && <div style={{ fontSize: 30, lineHeight: 1.4, color: '#b4bcb8', display: 'block', lineClamp: 2 }}>
            { excerpt.length > 140 ? `${excerpt.slice(0, 140)}…` : excerpt }
          </div> }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28, color: '#8a948f' }}>
          <span>{ author }</span>
          <div style={{ display: 'flex', gap: 12 }}>
            { tags.slice(0, 3).map(tag => <span key={tag} style={{ padding: '6px 16px', borderRadius: 8, background: '#16312a', color: '#76bbe2', fontSize: 24 }}>{ tag }</span>) }
          </div>
        </div>
      </div>
      { cover && <img src={cover} width={480} height={616} style={{ objectFit: 'cover' }} alt="" /> }
    </div>
  );
}
