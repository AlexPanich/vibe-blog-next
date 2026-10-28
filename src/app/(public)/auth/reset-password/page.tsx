import ResetPasswordForm from "@/domains/users/components/ResetPasswordForm";
import { findResetToken } from "@/domains/users/shared/findResetToken";
import Link from "next/link";
import { IconLinkOff } from "@tabler/icons-react";
import z from "zod";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Новый пароль' };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/auth/reset-password'>){
  const token = z.string().min(1).catch('').parse((await searchParams).token);
  const alive = token ? await findResetToken(token) : undefined;

  return <section className="ui-panel ui-panel--narrow">
    <div className="ui-panel__head">
      <p className="ui-kicker">Восстановление</p>
      <h1 className="ui-panel__title">Новый пароль</h1>
    </div>
    { alive ? <ResetPasswordForm token={token} /> : (
      <div className="ui-empty">
        <IconLinkOff size={26} stroke={1.6} />
        <p>{ token ? 'Ссылка больше не работает — она одноразовая и действует час.' : 'Ссылка неполная.' }</p>
        <Link href="/auth/forgot-password">Запросить письмо ещё раз</Link>
      </div>
    ) }
  </section>
}
