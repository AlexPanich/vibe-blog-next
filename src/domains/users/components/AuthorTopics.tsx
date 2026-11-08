import Link from "@/components/general/Link";
import { tagTone } from "@/domains/tags/exports/tagTone";
import { authorsUrl } from "@/domains/users/shared/authorsUrl";

/*
  Рубрики автора — цветные чипы (спека 30), каждый ведёт к авторам с этой рубрикой
*/
export default function AuthorTopics({ topics }: { topics: { id: number, name: string, slug: string }[] }) {
  if(topics.length === 0){
    return null;
  }

  return (
    <div className="ui-author-topics">
      { topics.map(topic => (
        <Link key={topic.id} href={authorsUrl({ tag: topic.slug })} className="ui-author-topic" data-tone={tagTone(topic.id)}>
          { topic.name }
        </Link>
      )) }
    </div>
  );
}
