import 'client-only';
import { useEffect } from "react";

const QUESTION = 'Есть несохранённые изменения. Уйти со страницы?';

/*
  Предупреждение о несохранённом при уходе со страницы (спека 49): закрытие и перезагрузка —
  диалог браузера (beforeunload), клик по ссылке внутри приложения — confirm. Клик ловится на
  document в capture-фазе, до обработчика Link, поэтому сам Link ничего не знает о guard.
  Кнопку «Назад» браузера App Router отменить не даёт — она не перехватывается
*/
export default function useLeaveGuard(dirty: boolean){
  useEffect(() => {
    if(!dirty){
      return;
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    const onClick = (e: MouseEvent) => {
      if(!leavesPage(e)){
        return;
      }

      if(!window.confirm(QUESTION)){
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [ dirty ]);
}

// Клик уводит со страницы в этой же вкладке: своя ссылка, без модификаторов и не якорь этой страницы
function leavesPage(e: MouseEvent){
  if(e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey){
    return false;
  }

  const link = e.target instanceof Element ? e.target.closest('a[href]') : null;

  if(!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download')){
    return false;
  }

  const to = new URL(link.href, location.href);

  if(to.origin !== location.origin){
    // Внешний адрес уходит полной загрузкой — его спросит beforeunload
    return false;
  }

  return !(to.pathname === location.pathname && to.search === location.search && to.hash !== '');
}
