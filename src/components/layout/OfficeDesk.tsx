import OfficeMenu from "@/components/navigation/OfficeMenu";
import OfficeBackLink from "@/components/navigation/OfficeBackLink";
import { getOfficeMenu } from "@/components/navigation/getOfficeMenu";
import type { ReactNode } from "react";

// Рабочий стол кабинета: левое меню и колонка страницы. На телефоне меню нет — над колонкой ссылка «‹ Кабинет».
export default async function OfficeDesk({ children }: { children: ReactNode }) {
  return (
    <div className="ui-desk">
      <OfficeMenu menu={await getOfficeMenu()} />
      <div className="ui-desk__main">
        <OfficeBackLink />
        { children }
      </div>
    </div>
  );
}
