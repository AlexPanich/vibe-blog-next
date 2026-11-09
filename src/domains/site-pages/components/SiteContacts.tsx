import Link from "@/components/general/Link";
import { IconArrowUpRight, IconMail, IconMessageCircle, IconSend } from "@tabler/icons-react";

type SiteContactsProps = {
  email: string | null,
  userId: number | null
}

/*
  Карточки под текстом «Контактов» (спека 31): почта и личное сообщение администрации.
  Гостя «Написать» уводит на вход proxy.ts, как любую ссылку в кабинет
*/
export default function SiteContacts({ email, userId }: SiteContactsProps) {
  if(!email && !userId){
    return null;
  }

  return (
    <div className="ui-site-contacts">
      { email && <section className="ui-site-contact">
        <span className="ui-site-contact__icon" data-tone="coral"><IconMail size={22} stroke={1.8} aria-hidden /></span>
        <div className="ui-site-contact__text">
          <h2 className="ui-site-contact__title">Почта</h2>
          <p className="ui-site-contact__hint">Ответим в течение пары рабочих дней</p>
        </div>
        <a href={`mailto:${email}`} className="ui-site-contact__mail">
          { email }<IconArrowUpRight size={16} aria-hidden />
        </a>
      </section> }

      { userId && <section className="ui-site-contact">
        <span className="ui-site-contact__icon" data-tone="plum"><IconMessageCircle size={22} stroke={1.8} aria-hidden /></span>
        <div className="ui-site-contact__text">
          <h2 className="ui-site-contact__title">Написать администрации</h2>
          <p className="ui-site-contact__hint">Личное сообщение в кабинете — нужно войти в аккаунт</p>
        </div>
        <Link href={`/office/messages/new?to=${userId}`} className="ui-site-btn">
          <IconSend size={16} aria-hidden />Написать
        </Link>
      </section> }
    </div>
  );
}
