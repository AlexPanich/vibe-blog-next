import ForgotPasswordForm from "@/domains/users/components/ForgotPasswordForm";
import Link from "@/components/general/Link";

export const metadata = { title: 'Восстановление пароля' };

export default function ForgotPasswordPage(){
  return <section className="ui-panel ui-panel--narrow">
    <div className="ui-panel__head">
      <p className="ui-kicker">Восстановление</p>
      <h1 className="ui-panel__title">Забыли пароль?</h1>
    </div>
    <ForgotPasswordForm />
    <div className="ui-panel__foot">
      Вспомнили? <Link href="/auth/login">Войти</Link>
    </div>
  </section>
}
