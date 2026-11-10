import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import { IconLayoutDashboard } from "@tabler/icons-react";

// notFound() в кабинете — внутри его меню (спека 52)
export default function OfficeNotFound() {
  return (
    <>
      <title>Страница не найдена — Кабинет</title>
      <ErrorScreen
        code="404"
        kicker="Ошибка 404"
        title="Такой страницы нет"
        actions={<>
          <ButtonLink href="/office" size="md" className="ui-ink-button" leftSection={<IconLayoutDashboard size={17} />}>В кабинет</ButtonLink>
          <ButtonLink href="/office/posts" size="md" variant="default">Мои посты</ButtonLink>
        </>}
      >
        Пост мог быть удалён или принадлежит другому автору. Ваши посты — в разделе «Мои посты».
      </ErrorScreen>
    </>
  );
}
