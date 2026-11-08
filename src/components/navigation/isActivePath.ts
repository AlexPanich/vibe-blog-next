// Пункт меню активен на своей странице и на вложенных; главная — только на себе.
export function isActivePath(pathname: string, href: string) {
  if(href === '/'){
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
