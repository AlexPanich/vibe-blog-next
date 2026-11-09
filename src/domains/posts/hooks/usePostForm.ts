import 'client-only';
import type { PostType } from "@/database/schema";
import type { PostDetailsDto, PostEditorDto } from "@/domains/posts/dto/postRequests";
import type { PostDetailsResource } from "@/domains/posts/dto/postResources";
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
  // Пустой NumberInput отдаёт ''
  lat: number | string,
  lng: number | string
}

type PostFormInitial = Pick<PostFormState, 'url' | 'title' | 'content' | 'tagIds'>
  & { lead: string | null }
  & Partial<PostDetailsResource>

export default function usePostForm(initial: PostFormInitial){
  const form = useForm<PostFormState>({
    url: initial.url,
    title: initial.title,
    lead: initial.lead ?? '',
    content: initial.content,
    tagIds: initial.tagIds,
    type: initial.type ?? 'simple',
    source: initial.source ?? '',
    lat: initial.lat ?? '',
    lng: initial.lng ?? ''
  });

  // Вход схемы, а не выход: lead до нормализации — строка, null из него делает zod
  function payload(): Omit<PostEditorDto, 'submit'> {
    const { url, title, lead, content, tagIds } = form.data;

    return { url, title, lead, content, tagIds, details: details(form.data) };
  }

  return { ...form, payload };
}

export type PostForm = ReturnType<typeof usePostForm>

function details({ type, source, lat, lng }: PostFormState): PostDetailsDto {
  if(type === 'translate'){
    return { type, source };
  }
  else if(type === 'travel'){
    // '' уходит как NaN — zod ответит «Укажите число», а не молча 0
    return { type, lat: lat === '' ? NaN : Number(lat), lng: lng === '' ? NaN : Number(lng) };
  }

  return { type };
}
