import type { PostFeedFilterDto } from "@/domains/posts/dto/postFeedRequests";

type Period = NonNullable<PostFeedFilterDto['period']>;
type Sort = PostFeedFilterDto['sort'];

/*
  Период по умолчанию зависит от сортировки (спека 34, п. 7): «Популярные» и «Обсуждаемые» —
  за месяц, остальные — за всё время. В dto период остаётся undefined, если его нет в URL:
  иначе смена сортировки тащила бы «месяц» в «Новые»
*/
export function defaultFeedPeriod(sort: Sort): Period {
  return sort === 'popular' || sort === 'discussed' ? 'month' : 'all';
}

// Действующий период ленты
export function feedPeriod(filter: { sort?: Sort, period?: PostFeedFilterDto['period'] }): Period {
  return filter.period ?? defaultFeedPeriod(filter.sort ?? 'new');
}

// Значение для URL: умолчание сортировки не пишется — одна выборка, один адрес
export function feedPeriodParam(filter: { sort?: Sort, period?: PostFeedFilterDto['period'] }): Period | undefined {
  const period = feedPeriod(filter);

  return period === defaultFeedPeriod(filter.sort ?? 'new') ? undefined : period;
}
