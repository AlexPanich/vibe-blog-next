import LoginForm from "@/domains/users/components/LoginForm";
import Link from "next/link";

export const metadata = { title: 'Вход' };

export default function LoginPage(){
  return <section className="ui-panel ui-panel--narrow">
    <div className="ui-panel__head">
      <p className="ui-kicker">С возвращением</p>
      <h1 className="ui-panel__title">Вход</h1>
    </div>
    <LoginForm />
    <div className="ui-panel__foot">
      Нет аккаунта? <Link href="/auth/signup">Зарегистрируйтесь</Link>
    </div>
  </section>
}
