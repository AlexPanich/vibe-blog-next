import ButtonLink from "@/components/general/ButtonLink";
import { IconMoodEmpty } from "@tabler/icons-react";

// Пустая лента /posts: ничего не нашлось ни по словам, ни по смыслу
export default function FeedEmpty() {
  return (
    <div className="ui-empty">
      <IconMoodEmpty size={26} stroke={1.6} />
      <p>Ничего не нашлось.</p>
      <ButtonLink href="/posts" variant="default">Сбросить всё</ButtonLink>
    </div>
  );
}
