import ErrorScreen from "@/components/general/ErrorScreen";
import ButtonLink from "@/components/general/ButtonLink";
import { getAuthUser } from "@/shared/auth";
import { IconLogin2, IconNews } from "@tabler/icons-react";

/*
  forbidden() в публичной части (спека 52). Сейчас его здесь никто не вызывает — граница
  на будущее. Гостю следующий шаг — вход, вошедшему — лента
*/
export default async function Forbidden() {
  const user = await getAuthUser();

  return (
    <>
      <title>Нет доступа — Vibe</title>
      <ErrorScreen
        code="403"
        kicker="Ошибка 403"
        title="Сюда нельзя"
        actions={user
          ? <>
            <ButtonLink href="/posts" size="md" className="ui-ink-button" leftSection={<IconNews size={17} />}>В ленту</ButtonLink>
            <ButtonLink href="/" size="md" variant="default">На главную</ButtonLink>
          </>
          : <>
            <ButtonLink href="/auth/login" size="md" className="ui-ink-button" leftSection={<IconLogin2 size={17} />}>Войти</ButtonLink>
            <ButtonLink href="/posts" size="md" variant="default">В ленту</ButtonLink>
          </>}
      >
        { user
          ? 'Эта страница закрыта для вашей учётной записи.'
          : 'Эта страница открыта не всем. Войдите — возможно, у вашей учётной записи есть доступ.' }
      </ErrorScreen>
    </>
  );
}
