import Link from "@/components/general/Link";
import { IconArrowRight } from "@tabler/icons-react";

/*
  Фиолетовый баннер «Найдите ещё авторов» (спека 42) — вся карточка ссылка на /authors.
  На телефоне — одна строка: заголовок и стрелка
*/
export default function AuthorsFindBanner() {
  return (
    <Link href="/authors" className="ui-find-authors">
      <span className="ui-find-authors__title">Найдите ещё авторов</span>
      <span className="ui-find-authors__text">Подборка тех, кто пишет о том же, что вы читаете</span>
      <span className="ui-find-authors__button">К авторам<IconArrowRight size={15} stroke={1.8} /></span>
    </Link>
  );
}
