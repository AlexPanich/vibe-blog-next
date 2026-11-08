import Link from "@/components/general/Link";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import type { Route } from "next";

type PagerProps<T extends string> = {
  page: number,
  pages: number,
  href: (page: number) => Route<T>
}

/*
  Пагинация ссылками: «← 1 … 4 5 6 … 12 →». Только на сервере — href функцией.
  Одна страница — ничего не рисует
*/
export default function Pager<T extends string>({ page, pages, href }: PagerProps<T>) {
  if(pages <= 1){
    return null;
  }

  return (
    <nav className="ui-pager" aria-label="Страницы">
      { page > 1 && <Link href={href(page - 1)} className="ui-pager__item" aria-label="Предыдущая страница">
        <IconArrowLeft size={16} stroke={1.8} />
      </Link> }
      { pageList(page, pages).map((n, i) => n === null
        ? <span key={`gap-${i}`} className="ui-pager__gap">…</span>
        : <Link key={n} href={href(n)} className="ui-pager__item" data-active={n === page} aria-current={n === page ? 'page' : undefined}>
          { n }
        </Link>) }
      { page < pages && <Link href={href(page + 1)} className="ui-pager__item" aria-label="Следующая страница">
        <IconArrowRight size={16} stroke={1.8} />
      </Link> }
    </nav>
  );
}

// Первая, последняя и по одной вокруг текущей; разрыв — null
function pageList(page: number, pages: number){
  const keep = new Set([ 1, pages, page - 1, page, page + 1 ].filter(n => n >= 1 && n <= pages));
  const sorted = [ ...keep ].sort((a, b) => a - b);
  const list: (number | null)[] = [];

  for(const n of sorted){
    const prev = list.at(-1);

    if(typeof prev === 'number' && n - prev === 2){
      list.push(prev + 1);
    }
    else if(typeof prev === 'number' && n - prev > 2){
      list.push(null);
    }

    list.push(n);
  }

  return list;
}
