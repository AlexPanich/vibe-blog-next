import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import { IconNews } from "@tabler/icons-react";

// notFound() в публичной части — внутри шапки и подвала (спека 52)
export default function NotFound() {
  return (
    <>
      <title>Страница не найдена — Vibe</title>
      <ErrorScreen
        code="404"
        kicker="Ошибка 404"
        title="Такой страницы нет"
        actions={<>
          <ButtonLink href="/posts" size="md" className="ui-ink-button" leftSection={<IconNews size={17} />}>В ленту</ButtonLink>
          <ButtonLink href="/" size="md" variant="default">На главную</ButtonLink>
        </>}
      >
        Возможно, пост сняли с публикации или в адресе опечатка. Свежие истории — в ленте.
      </ErrorScreen>
    </>
  );
}
