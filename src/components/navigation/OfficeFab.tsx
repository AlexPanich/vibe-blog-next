import type { Icon } from "@tabler/icons-react";
import type { Route } from "next";
import Link from "@/components/general/Link";

type OfficeFabProps<T extends string> = { href: Route<T>, label: string, icon: Icon }

// Круглая коралловая кнопка над нижней панелью — только на телефоне: «Новый пост», «Новое сообщение».
export default function OfficeFab<T extends string>({ href, label, icon: FabIcon }: OfficeFabProps<T>) {
  return (
    <Link href={href} className="ui-fab" aria-label={label} title={label}>
      <FabIcon size={22} stroke={2} aria-hidden />
    </Link>
  );
}
