'use client'

import 'client-only';
import { Button, type ButtonProps } from "@mantine/core";
import type { Route } from "next";
import Link from "@/components/general/Link";

type ButtonLinkProps<T extends string> = ButtonProps & { href: Route<T> }

// Кнопка-ссылка. Серверный компонент не может передать `component={Link}` в
// Mantine — функция не сериализуется, поэтому связка живёт здесь, на клиенте.
export default function ButtonLink<T extends string>({ href, ...props }: ButtonLinkProps<T>) {
  return <Button {...props} renderRoot={root => <Link {...root} href={href} />} />;
}
