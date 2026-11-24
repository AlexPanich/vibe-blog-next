// Заглушка смыслового блока, пока модель считает вектор запроса: заголовок тот же — текст не прыгает
export default function PostSemanticSkeleton() {
  return (
    <section className="ui-post-more ui-feed-semantic" aria-busy="true">
      <h2 className="ui-post-more__title">Похоже по смыслу</h2>
      <div className="ui-post-grid">
        { [ 0, 1, 2 ].map(i => (
          <div key={i} className="ui-post-skeleton" aria-hidden="true">
            <div className="ui-post-skeleton__cover" />
            <div className="ui-post-skeleton__line" />
            <div className="ui-post-skeleton__line ui-post-skeleton__line--short" />
          </div>
        )) }
      </div>
    </section>
  );
}
