import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Текст поста. Без 'use client': рендерит и серверная страница поста, и предпросмотр в форме —
// вид совпадает. Сырой HTML пропускается, картинок нет, опасные протоколы ссылок режет urlTransform.
export default function PostMarkdown({ content }: { content: string }) {
  return (
    <div className="ui-prose">
      <ReactMarkdown remarkPlugins={[ remarkGfm ]} skipHtml disallowedElements={[ 'img' ]} components={COMPONENTS}>
        { content }
      </ReactMarkdown>
    </div>
  );
}

// h1 на странице — заголовок поста, поэтому заголовки текста на уровень ниже
const COMPONENTS: Components = {
  h1: ({ children }) => <h2>{ children }</h2>,
  h2: ({ children }) => <h3>{ children }</h3>,
  h3: ({ children }) => <h4>{ children }</h4>,
  h4: ({ children }) => <h5>{ children }</h5>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{ children }</a>,
};
