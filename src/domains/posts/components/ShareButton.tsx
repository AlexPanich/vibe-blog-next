'use client'

import 'client-only';
import { showToast } from "@/components/general/showToast";
import { IconLink, IconShare2 } from "@tabler/icons-react";

type ShareButtonProps = {
  title: string,
  // С подписью — пилюля «Поделиться», без — круглая иконка
  withLabel?: boolean,
  iconSize?: number,
  className?: string
}

/*
  «Поделиться» текущей страницей: пост и страница фото (спека 30)
*/
export default function ShareButton({ title, withLabel = false, iconSize = 17, className = '' }: ShareButtonProps) {
  return (
    <button
      type="button"
      className={`ui-pill ${withLabel ? '' : 'ui-pill--icon'} ${className}`}
      aria-label={withLabel ? undefined : 'Поделиться'}
      onClick={() => share(title)}
    >
      <IconShare2 size={iconSize} stroke={1.8} />{ withLabel && <span>Поделиться</span> }
    </button>
  );
}

// Системное «поделиться» на телефоне, иначе — ссылка в буфер
async function share(title: string){
  const url = window.location.href.split('#')[0];

  if(navigator.share){
    try{
      await navigator.share({ title, url });
    }
    catch{
      // Отмена в системном окне — не ошибка
    }

    return;
  }

  try{
    await navigator.clipboard.writeText(url);
    showToast({ id: 'post-share', icon: <IconLink size={18} />, title: 'Ссылка скопирована', text: title, href: null });
  }
  catch{
    showToast({ id: 'post-share', icon: <IconLink size={18} />, title: 'Не удалось скопировать', text: url, href: null });
  }
}
