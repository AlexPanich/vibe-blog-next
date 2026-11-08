import type { CSSProperties } from "react";
import { imageUrl } from "@/core/imageUrl";

type UserAvatarProps = {
  name: string,
  avatarKey?: string | null,
  size?: number
}

/*
  Аватар или кружок с первой буквой имени. alt пустой: имя всегда стоит рядом текстом.
  Без 'use client' — рендерят и серверные страницы, и клиентские компоненты.
  Размер — переменная --avatar-size, а не width в style: так место на странице может
  перебить его обычным CSS (`.ui-x .ui-avatar { width: 40px; height: 40px }`)
*/
export default function UserAvatar({ name, avatarKey, size = 72 }: UserAvatarProps) {
  const style = { '--avatar-size': `${size}px` } as CSSProperties;

  if(avatarKey){
    return <img
      className="ui-avatar ui-avatar--image"
      src={imageUrl(avatarKey, size > 64 ? 256 : 64)}
      width={size}
      height={size}
      style={style}
      alt=""
    />
  }

  return (
    <span className="ui-avatar" style={style} aria-hidden>
      { name.trim().charAt(0).toUpperCase() || '?' }
    </span>
  );
}
