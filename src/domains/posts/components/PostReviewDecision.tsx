'use client'

import 'client-only';
import { approvePostAction, rejectPostAction } from "@/domains/posts/actions/postModerationActions";
import { claimReviewAction, releaseReviewAction, takeoverReviewAction } from "@/domains/posts/actions/postReviewActions";
import { fieldError } from "@/components/general/FieldError";
import LocalDate from "@/components/general/LocalDate";
import useForm from "@/hooks/useForm";
import { Button, Textarea } from "@mantine/core";
import { IconCheck, IconEye, IconHandGrab, IconHandStop, IconX } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type PostReviewDecisionProps = {
  id: number,
  // free — никто не взял, mine — ревью ведёте вы, other — ведёт другой модератор
  review: 'free' | 'mine' | 'other',
  reviewer?: { name: string, startedAt: Date },
  // Может ли текущий пользователь принять решение (своё или свободное ревью, admin — всегда)
  canDecide: boolean,
  canTakeover: boolean
}

/*
  Карточка решения по посту на модерации (спека 42, шаг 14): плашка «кто ведёт ревью»,
  комментарий, «Опубликовать» / «Отклонить», «Снять себя с ревью». На телефоне — шторка,
  закреплённая снизу. Страница обновляется сама: actions делают revalidatePath
*/
export default function PostReviewDecision({ id, review, reviewer, canDecide, canTakeover }: PostReviewDecisionProps) {
  const approve = useAction(approvePostAction.bind(null, id));
  const reject = useAction(rejectPostAction.bind(null, id));
  const claim = useAction(claimReviewAction.bind(null, id));
  const release = useAction(releaseReviewAction.bind(null, id));
  const takeover = useAction(takeoverReviewAction.bind(null, id));
  const form = useForm({ comment: '' });
  const pending = approve.isPending || reject.isPending;
  const error = [ approve, reject, claim, release, takeover ].map(a => a.result.serverError?.message).find(Boolean);

  return (
    <section className="ui-decision" data-sheet="" aria-label="Решение по посту">
      <div className="ui-decision__owner" data-review={review}>
        <IconEye size={16} stroke={1.8} />
        { review === 'mine' && <p>
          <span className="ui-decision__desk-only">Ревью ведёте вы — другие модераторы решение принять не могут</span>
          <span className="ui-decision__phone-only">Ревью ведёте вы</span>
        </p> }
        { review === 'free' && <p>Пост никто не взял на ревью</p> }
        { review === 'other' && reviewer && <p>
          Ревью ведёт { reviewer.name } с <LocalDate value={reviewer.startedAt} options={{ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }} />
        </p> }
      </div>

      { review === 'free' && <Button
        className="ui-ink-button"
        fullWidth
        leftSection={<IconHandGrab size={16} stroke={1.8} />}
        loading={claim.isPending}
        onClick={() => claim.execute()}
      >
        Взять на ревью
      </Button> }

      { review === 'other' && canTakeover && <Button
        variant="default"
        fullWidth
        leftSection={<IconHandStop size={16} stroke={1.8} />}
        loading={takeover.isPending}
        onClick={() => takeover.execute()}
      >
        Перехватить ревью
      </Button> }

      { canDecide && <form className="ui-decision__form" onSubmit={e => e.preventDefault()}>
        <Textarea
          className="ui-decision__comment"
          classNames={{ label: 'ui-decision__label', description: 'ui-decision__hint' }}
          label="Комментарий модератора"
          description="Обязателен при отклонении — автор увидит его в кабинете"
          placeholder="Что поправить автору…"
          autosize
          minRows={1}
          maxRows={8}
          {...form.nv('comment')}
          onChange={e => form.update('comment', e.target.value)}
          error={fieldError(reject.result.validationErrors, 'comment') ?? fieldError(approve.result.validationErrors, 'comment')}
        />
        <div className="ui-decision__buttons">
          <Button
            color="mint"
            leftSection={<IconCheck size={16} stroke={2} />}
            loading={approve.isPending}
            disabled={pending && !approve.isPending}
            onClick={() => { reject.reset(); approve.execute(form.data) }}
          >
            Опубликовать
          </Button>
          <Button
            variant="outline"
            className="ui-decision__reject"
            leftSection={<IconX size={16} stroke={2} />}
            loading={reject.isPending}
            disabled={pending && !reject.isPending}
            onClick={() => { approve.reset(); reject.execute(form.data) }}
          >
            Отклонить
          </Button>
        </div>
      </form> }

      { error && <p className="ui-decision__error" role="alert">{ error }</p> }

      { review === 'mine' && <button type="button" className="ui-decision__release" disabled={release.isPending} onClick={() => release.execute()}>
        Снять себя с ревью
      </button> }
    </section>
  );
}
