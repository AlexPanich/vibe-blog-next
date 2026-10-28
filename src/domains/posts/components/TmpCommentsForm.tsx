'use client'

import 'client-only';
import UserGate from "@/components/general/UserGate";
import Link from "@/components/general/Link";

export default function TmpCommentsForm() {
  return (
    <div>
      <p className="ui-kicker">Комментарии</p>
      <UserGate
        guest={<p><Link href="/auth/login">Войдите</Link>, чтобы оставить комментарий.</p>}
        auth={user => <p>Комментируете как { user.name }</p>}
      />
    </div>
  );
}
