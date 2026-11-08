import { IconCircleCheck, IconSparkles } from "@tabler/icons-react";

const TIPS = [
  'Живую обложку — своё фото, а не сток',
  'Конкретику: цены, время, адреса',
  'Подзаголовки каждые 3–4 абзаца'
]

// Подсказка в колонке редактора (спека 42) — статичная, без данных.
export default function PostEditorTips() {
  return (
    <section className="ui-editor-tips">
      <h2><IconSparkles size={18} stroke={1.8} />Что любят читатели</h2>
      <ul>
        { TIPS.map(tip => <li key={tip}><IconCircleCheck size={15} stroke={2} />{ tip }</li>) }
      </ul>
    </section>
  );
}
