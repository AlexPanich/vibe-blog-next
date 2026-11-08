import HomeWriteLink from "@/domains/posts/components/HomeWriteLink";
import { IconSparkles } from "@tabler/icons-react";

/*
  Коралловый баннер «Есть что рассказать?» (спека 30): главная и страница авторов.
  Без 'use client' — кнопка внутри сама узнаёт, кто смотрит
*/
export default function HomeWriteBand() {
  return (
    <section className="ui-home-band">
      <IconSparkles className="ui-home-band__spark ui-home-band__spark--a" size={36} stroke={1.6} aria-hidden />
      <IconSparkles className="ui-home-band__spark ui-home-band__spark--b" size={44} stroke={1.6} aria-hidden />
      <h2 className="ui-home-band__title">Есть что рассказать?</h2>
      <p className="ui-home-band__deck">
        Путешествие, перевод или личный опыт — оформите историю в кабинете, а модераторы помогут
        довести её до ленты.
      </p>
      <HomeWriteLink
        className="ui-home-btn ui-home-btn--light"
        labels={{ author: 'Написать пост', member: 'Подать заявку в авторы', guest: 'Стать автором' }}
        arrow
      />
    </section>
  );
}
