import type { PostType } from "@/database/schema";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import { cutWords } from "@/core/text";

type PostOgImageProps = {
  // Обложка data URL (png 480×630) — справа от текста
  cover: string | null,
  type: PostType,
  title: string,
  // Подзаголовок или текст поста без разметки; длинный обрезается здесь по слову
  summary: string,
  author: string,
  tags: string[]
}

/*
  Разметка превью ссылки 1200×630 для next/og. Satori не знает CSS-переменных и наших классов,
  поэтому цвета заданы прямо — тёмная палитра из tokens.css. Шрифт — Geist из комплекта
  next/og: кириллица в нём есть, жирного начертания нет
*/
export default function PostOgImage({ cover, type, title, summary, author, tags }: PostOgImageProps) {
  const long = title.length > 60;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0b1110', color: '#e9ecef', fontFamily: 'Geist', borderTop: '14px solid #3ebf6e' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 32, color: '#3ebf6e' }}>
          <span style={{ color: '#e9ecef', fontWeight: 700 }}>Vibe.</span>
          <span style={{ fontSize: 22, letterSpacing: 4, color: '#8a948f' }}>ХОД ЗА ТОБОЙ</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          { type !== 'simple' && <span style={{ fontSize: 26, letterSpacing: 3, color: '#3ebf6e' }}>{ POST_TYPE_LABELS[type].toUpperCase() }</span> }
          <div style={{ fontSize: titleSize(title), fontWeight: 700, lineHeight: 1.1, display: 'block', lineClamp: 4, wordBreak: 'break-word' }}>{ title }</div>
          { summary && <div style={{ fontSize: 26, lineHeight: 1.4, color: '#b4bcb8', display: 'block', lineClamp: long ? 2 : 3 }}>
            { cutWords(summary, long ? 75 : 110) }
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

/*
  Заголовок и подзаголовок должны поместиться над подвалом: подзаголовок — три строки (~110
  символов при 26px), под длинным заголовком — мельче заголовок и две строки (~75). Текст
  режется по слову заранее, lineClamp — подстраховка на широкие буквы. Заголовок до 120 символов
  (спека 49) — не больше четырёх строк, слово без пробелов переносится
*/
function titleSize(title: string){
  if(title.length > 90){
    return 42;
  }
  else if(title.length > 60){
    return 50;
  }
  else if(title.length > 40){
    return 60;
  }

  return 76;
}
