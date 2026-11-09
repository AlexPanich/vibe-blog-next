import Link from "@/components/general/Link";
import type { Route } from "next";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/*
  Текст страницы о блоге. Не PostMarkdown: там заголовки сдвинуты на уровень и все ссылки
  открываются в новой вкладке. Здесь `##` — h2, свои ссылки — в той же вкладке
*/
export default function SitePageMarkdown({ content }: { content: string }) {
  return (
    <div className="ui-prose">
      <ReactMarkdown remarkPlugins={[ remarkGfm ]} skipHtml disallowedElements={[ 'img' ]} components={COMPONENTS}>
        { content }
      </ReactMarkdown>
    </div>
  );
}

const COMPONENTS: Components = {
  a: ({ href = '', children }) => href.startsWith('/') && !href.startsWith('//')
    ? <Link href={href as Route}>{ children }</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer">{ children }</a>,
};
