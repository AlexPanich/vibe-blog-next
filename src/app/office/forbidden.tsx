import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import { IconLayoutDashboard } from "@tabler/icons-react";

// forbidden() из breakIfCant в кабинете — внутри его меню (спека 52)
export default function OfficeForbidden() {
  return (
    <>
      <title>Нет доступа — Кабинет</title>
      <ErrorScreen
        code="403"
        kicker="Ошибка 403"
        title="Нет доступа"
        actions={<>
          <ButtonLink href="/office" size="md" className="ui-ink-button" leftSection={<IconLayoutDashboard size={17} />}>В кабинет</ButtonLink>
          <ButtonLink href="/contacts" size="md" variant="default">Контакты</ButtonLink>
        </>}
      >
        У вашей учётной записи нет прав на эту страницу. Если доступ нужен по работе — напишите администрации.
      </ErrorScreen>
    </>
  );
}
