import 'server-only';
import { resource } from "@/core/resource";
import { postResource } from "@/domains/posts/dto/postResources";
import { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";
import { semanticFeed } from "@/domains/posts/shared/semanticFeed";
import PostCardBridge from "@/domains/posts/components/PostCardBridge";
import FeedEmpty from "@/domains/posts/components/FeedEmpty";

type PostSemanticResultsProps = {
  filter: Omit<PostFeedFilterDto, 'limit'>,
  // По словам ничего: блок встаёт на место пустого состояния (спека 56, п. 14)
  empty?: boolean
}

/*
  «Похоже по смыслу» под лентой (спека 56): рисуется под Suspense — запрос к модели не держит
  ленту. Пусто — ничего, а при пустой ленте — обычное «Ничего не нашлось»
*/
export default async function PostSemanticResults({ filter, empty = false }: PostSemanticResultsProps) {
  const cards = await semanticFeed(filter);

  if(cards.length === 0){
    return empty ? <FeedEmpty /> : null;
  }

  return (
    <section className="ui-post-more ui-feed-semantic">
      <h2 className="ui-post-more__title">Похоже по смыслу</h2>
      { empty && <p className="ui-feed-semantic__lead">По словам ничего, но вот похожее по смыслу</p> }
      <div className="ui-post-grid">
        { cards.map(card => <PostCardBridge key={card.id} post={resource(postResource, card)} />) }
      </div>
    </section>
  );
}
