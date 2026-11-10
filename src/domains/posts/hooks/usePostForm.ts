import 'client-only';
import type { PostType } from "@/database/schema";
import type { PostEditorDto } from "@/domains/posts/dto/postRequests";
import type { PostDetailsResource, RoutePointResource } from "@/domains/posts/dto/postResources";
import useForm from "@/hooks/useForm";

/*
  Состояние формы плоское (как в БД), в запрос уходит tagged union details.
  Поля чужого типа в состоянии остаются: вернулся на тип — значения на месте
*/
export type PostFormState = {
  url: string,
  title: string,
  lead: string,
  content: string,
  tagIds: number[],
  type: PostType,
  source: string,
  // Маршрут путешествия (спека 37)
  points: RouteFormPoint[],
  // Пустой NumberInput отдаёт ''
  travelDays: number | string
}

/*
  Точка в форме. key — только для React: при ↑/↓ строка списка едет вместе с фокусом и
  недописанной подписью. В запрос не уходит
*/
export type RouteFormPoint = { key: number, lat: number, lng: number, label: string }

type PostFormInitial = Pick<PostFormState, 'url' | 'title' | 'content' | 'tagIds'>
  & { lead: string | null }
  & Partial<PostDetailsResource>
  & { points?: RoutePointResource[] }

export default function usePostForm(initial: PostFormInitial){
  const form = useForm<PostFormState>({
    url: initial.url,
    title: initial.title,
    lead: initial.lead ?? '',
    content: initial.content,
    tagIds: initial.tagIds,
    type: initial.type ?? 'simple',
    source: initial.source ?? '',
    points: (initial.points ?? []).map((point, key) => ({ key, lat: point.lat, lng: point.lng, label: point.label ?? '' })),
    travelDays: initial.travelDays ?? ''
  });

  // Вход схемы, а не выход: lead до нормализации — строка, null из него делает zod
  function payload(): Omit<PostEditorDto, 'submit'> {
    const { url, title, lead, content, tagIds } = form.data;

    return { url, title, lead, content, tagIds, details: details(form.data) };
  }

  return { ...form, payload };
}

export type PostForm = ReturnType<typeof usePostForm>

function details({ type, source, points, travelDays }: PostFormState): PostEditorDto['details'] {
  if(type === 'translate'){
    return { type, source };
  }
  else if(type === 'travel'){
    return {
      type,
      points: points.map(({ lat, lng, label }) => ({ lat, lng, label })),
      travelDays: travelDays === '' ? null : Number(travelDays)
    };
  }

  return { type };
}
