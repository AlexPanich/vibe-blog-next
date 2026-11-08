'use client'

import 'client-only';
import Link from "@/components/general/Link";
import UserGate from "@/components/general/UserGate";
import { createPost } from "@/domains/posts/policy";
import { IconArrowRight } from "@tabler/icons-react";

type HomeWriteLinkProps = {
  className: string,
  // Подписи по тому, кто смотрит: автор, вошедший без роли author, гость
  labels: { author: string, member: string, guest: string },
  arrow?: boolean
}

/*
  Призыв писать на главной (спека 30): автору — новый пост, вошедшему — заявка в авторы,
  гостю — регистрация. До гидрации роль неизвестна — пустая пилюля того же размера
*/
export default function HomeWriteLink({ className, labels, arrow = false }: HomeWriteLinkProps) {
  const icon = arrow && <IconArrowRight size={18} />;

  return <UserGate
    fallback={<span className={className} data-pending aria-hidden>{ labels.guest }{ icon }</span>}
    guest={<Link href="/auth/signup" className={className}>{ labels.guest }{ icon }</Link>}
    auth={user => createPost(user)
      ? <Link href="/office/posts/create" className={className}>{ labels.author }{ icon }</Link>
      : <Link href="/office/author-request" className={className}>{ labels.member }{ icon }</Link>}
  />;
}
