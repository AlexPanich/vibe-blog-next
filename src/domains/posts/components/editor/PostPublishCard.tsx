import PostStatusTag from "@/domains/posts/components/PostStatusTag";
import { Button } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";

export type PostEditorIntent = 'save' | 'submit'

type PostPublishCardProps = {
  pending: PostEditorIntent | null,
  error?: string,
  onSubmit: () => void
}

const FLOW = [
  { title: 'Черновик',    hint: 'видите только вы' },
  { title: 'На проверке', hint: 'модератор читает пост' },
  { title: 'Опубликован', hint: 'виден всем читателям' }
]

/*
  Карточка публикации редактора (спека 42): статус, путь поста в три шага и две кнопки.
  Редактор открыт только у черновика, поэтому первый шаг всегда текущий. «Сохранить» —
  submit формы (Enter в поле тоже сохраняет), «Отправить» — отдельный обработчик
*/
export default function PostPublishCard({ pending, error, onSubmit }: PostPublishCardProps) {
  return (
    <section className="ui-publish-card" aria-label="Публикация">
      <div className="ui-publish-card__status">
        <span>Статус</span>
        <PostStatusTag status="draft" />
      </div>

      <ol className="ui-publish-flow">
        { FLOW.map((step, i) => (
          <li key={step.title} data-current={i === 0 || undefined}>
            <span className="ui-publish-flow__dot">{ i + 1 }</span>
            <span>
              <b>{ step.title }</b>
              <small>{ step.hint }</small>
            </span>
          </li>
        )) }
      </ol>

      { error && <p className="ui-publish-card__error" role="alert">{ error }</p> }

      <div className="ui-publish-card__buttons">
        <Button
          type="button"
          fullWidth
          size="md"
          leftSection={<IconSend size={16} />}
          loading={pending === 'submit'}
          disabled={pending === 'save'}
          onClick={onSubmit}
        >
          Отправить на проверку
        </Button>
        <Button type="submit" fullWidth size="md" variant="default" loading={pending === 'save'} disabled={pending === 'submit'}>
          Сохранить черновик
        </Button>
      </div>
    </section>
  );
}
