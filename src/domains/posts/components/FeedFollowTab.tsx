'use client'

import 'client-only';
import Link from "@/components/general/Link";
import useUser from "@/hooks/useUser";

/*
  Сегмент «Мои подписки» — просто ссылка на «Мою ленту» (спека 34, п. 4). Гостю не показывается;
  пользователь известен только на клиенте, поэтому до гидрации сегмента нет — как на сервере
*/
export default function FeedFollowTab() {
  const { user, ready } = useUser();

  if(!ready || !user){
    return null;
  }

  return <Link href="/office/feed">Мои подписки</Link>;
}
