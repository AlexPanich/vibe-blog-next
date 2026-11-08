'use client'

import 'client-only';
import { POST_TYPES, type PostType } from "@/database/schema";
import { POST_TYPE_LABELS } from "@/domains/posts/shared/postTypes";
import { IconFileText, IconLanguage, IconMapPin, type Icon } from "@tabler/icons-react";

type PostTypeCardsProps = {
  value: PostType,
  onChange: (value: PostType) => void
}

const CARDS: Record<PostType, { hint: string, icon: Icon, tone: string }> = {
  simple:    { hint: 'Свой текст',             icon: IconFileText, tone: 'coral' },
  translate: { hint: 'Со ссылкой на оригинал', icon: IconLanguage, tone: 'plum' },
  travel:    { hint: 'С точкой на карте',      icon: IconMapPin,   tone: 'mint' }
}

// Тип поста — три карточки-радио вместо селекта (спека 42). На телефоне — сегменты без подсказок.
export default function PostTypeCards({ value, onChange }: PostTypeCardsProps) {
  return (
    <div className="ui-field">
      <span className="ui-field__label" id="post-type-label">Тип поста</span>
      <div className="ui-type-cards" role="radiogroup" aria-labelledby="post-type-label">
        { POST_TYPES.map(type => {
          const { hint, icon: TypeIcon, tone } = CARDS[type];

          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={type === value}
              className="ui-type-card"
              data-tone={tone}
              onClick={() => onChange(type)}
            >
              <span className="ui-type-card__icon"><TypeIcon size={18} stroke={1.8} /></span>
              <span className="ui-type-card__text">
                <b>{ POST_TYPE_LABELS[type] }</b>
                <small>{ hint }</small>
              </span>
            </button>
          );
        }) }
      </div>
    </div>
  );
}
