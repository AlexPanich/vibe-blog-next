import SignupForm from "@/domains/users/components/SignupForm";
import Link from "next/link";

export const metadata = { title: 'Регистрация' };

export default function SignUp(){
  return <section className="ui-panel ui-panel--narrow">
    <div className="ui-panel__head">
      <p className="ui-kicker">Первый ход</p>
      <h1 className="ui-panel__title">Регистрация</h1>
    </div>
    <SignupForm />
    <div className="ui-panel__foot">
      Уже есть аккаунт? <Link href="/auth/login">Войдите</Link>
    </div>
  </section>
}
