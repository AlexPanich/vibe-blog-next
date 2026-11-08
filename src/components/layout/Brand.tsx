import Link from "@/components/general/Link";

// Знак и название сайта в шапке и подвале. Бренд меняется здесь, в одном месте.
export default function Brand() {
  return (
    <Link href="/" className="ui-brand" aria-label="Vibe — на главную">
      <span className="ui-brand__mark" aria-hidden>V</span>
      <span className="ui-brand__word">vibe</span>
    </Link>
  );
}
