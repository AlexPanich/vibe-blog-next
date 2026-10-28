import { IconChessKnightFilled } from "@tabler/icons-react";
import Link from "next/link";

// Знак и название сайта в шапке. Бренд меняется здесь, в одном месте.
export default function Brand() {
  return (
    <Link href="/" className="ui-brand">
      <IconChessKnightFilled className="ui-brand__mark" size={30} aria-hidden />
      <span className="ui-brand__word">
        Vibe<b>.</b>
      </span>
      <span className="ui-brand__motto">Ход за тобой</span>
    </Link>
  );
}
