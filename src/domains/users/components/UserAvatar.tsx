import { imageUrl } from "@/core/imageUrl";

type UserAvatarProps = {
  name: string,
  avatarKey?: string | null,
  size?: number
}

/*
  Аватар или кружок с первой буквой имени. alt пустой: имя всегда стоит рядом текстом.
  Без 'use client' — рендерят и серверные страницы, и клиентские компоненты
*/
export default function UserAvatar({ name, avatarKey, size = 72 }: UserAvatarProps) {
  if(avatarKey){
    return <img
      className="ui-avatar ui-avatar--image"
      src={imageUrl(avatarKey, size > 64 ? 256 : 64)}
      width={size}
      height={size}
      alt=""
    />
  }

  return (
    <span className="ui-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      { name.trim().charAt(0).toUpperCase() || '?' }
    </span>
  );
}
