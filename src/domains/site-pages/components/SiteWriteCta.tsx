import HomeWriteLink from "@/domains/posts/exports/HomeWriteLink";

/*
  Плашка «Хотите писать в Vibe?» внизу «О блоге». Кнопка сама узнаёт, кто смотрит: автору —
  новый пост, вошедшему — заявка, гостю — регистрация
*/
export default function SiteWriteCta() {
  return (
    <section className="ui-site-cta">
      <div className="ui-site-cta__text">
        <h2 className="ui-site-cta__title">Хотите писать в Vibe?</h2>
        <p className="ui-site-cta__sub">Расскажите о себе — заявку рассмотрят за пару дней</p>
      </div>
      <HomeWriteLink
        className="ui-site-btn"
        labels={{ author: 'Написать пост', member: 'Подать заявку в авторы', guest: 'Стать автором' }}
      />
    </section>
  );
}
