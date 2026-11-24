'use client'

import 'client-only';
import type { PostAiReviewResource } from "@/domains/posts/dto/postAiReviewResources";
import { AI_ISSUE_CATEGORY_LABELS } from "@/domains/posts/shared/postAiReviewLabels";
import { useReviewDraft } from "@/domains/posts/components/review/PostReviewDraftProvider";
import { Button } from "@mantine/core";
import { IconArrowDown } from "@tabler/icons-react";

type PostAiReviewBodyProps = {
  review: PostAiReviewResource,
  // Кнопка «Подставить в комментарий»: только у текущего разбора и при открытой форме решения
  canInsert: boolean
}

// Содержимое готового разбора: резюме и пункты с категорией, цитатой и пояснением
export default function PostAiReviewBody({ review, canInsert }: PostAiReviewBodyProps) {
  const { insert } = useReviewDraft();

  return (
    <div className="ui-ai-review__body">
      { review.summary && <p className="ui-ai-review__summary">{ review.summary }</p> }

      { review.issues.length > 0 && <ul className="ui-ai-review__issues">
        { review.issues.map((issue, i) => (
          <li key={i} className="ui-ai-review__issue">
            <span className="ui-ai-review__category">{ AI_ISSUE_CATEGORY_LABELS[issue.category] }</span>
            { issue.quote && <q className="ui-ai-review__quote">{ issue.quote }</q> }
            { issue.quoteMissing && <span className="ui-ai-review__missing">цитата не найдена в посте</span> }
            <p className="ui-ai-review__explanation">{ issue.explanation }</p>
          </li>
        )) }
      </ul> }

      { canInsert && review.rejectComment && <Button
        variant="default"
        size="xs"
        leftSection={<IconArrowDown size={14} stroke={2} />}
        onClick={() => insert(review.rejectComment!)}
      >
        Подставить в комментарий
      </Button> }
    </div>
  );
}
