'use client'

import 'client-only';
import type { PostStatus } from "@/database/schema";
import Link from "@/components/general/Link";
import { Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import type { Route } from "next";
import { IconDots, IconExternalLink, IconFileText, IconGavel, IconUser } from "@tabler/icons-react";

type PostAdminMenuProps = {
  post: { id: number, title: string, status: PostStatus, authorId: number }
}

/*
  «…» в строке «Всех постов» (спека 42, шаг 17): только переходы — действия с постом живут
  на своих страницах. «На сайте» — у опубликованного, «Модерация» (ревью, блокировка) — у
  всех, кроме черновика: черновик модерации не виден
*/
export default function PostAdminMenu({ post }: PostAdminMenuProps) {
  // Через MenuItem шаблон адреса не сужается до Route — приводим, как в PostPhotoStage
  const office = `/office/posts/${post.id}` as Route;
  const site = `/posts/${post.id}` as Route;
  const moderation = `/office/moderation/posts/${post.id}` as Route;
  const author = `/office/admin/users/${post.authorId}` as Route;

  return (
    <Menu position="bottom-end" withinPortal>
      <MenuTarget>
        <button type="button" className="ui-admin-posts__more" aria-label={`Действия с «${post.title}»`}>
          <IconDots size={16} stroke={1.8} />
        </button>
      </MenuTarget>
      <MenuDropdown>
        <MenuItem component={Link} href={office} leftSection={<IconFileText size={16} stroke={1.8} />}>
          Открыть в кабинете
        </MenuItem>
        { post.status === 'published' && <MenuItem component={Link} href={site} leftSection={<IconExternalLink size={16} stroke={1.8} />}>
          На сайте
        </MenuItem> }
        { post.status !== 'draft' && <MenuItem component={Link} href={moderation} leftSection={<IconGavel size={16} stroke={1.8} />}>
          Модерация
        </MenuItem> }
        <MenuItem component={Link} href={author} leftSection={<IconUser size={16} stroke={1.8} />}>
          Автор в админке
        </MenuItem>
      </MenuDropdown>
    </Menu>
  );
}
