import { IconMessages } from "@tabler/icons-react";

export const metadata = { title: 'Сообщения' };

// Правая колонка без открытого диалога; на телефоне спрятана — там видна колонка списка
export default function OfficeMessages() {
  return (
    <div className="ui-messenger__empty">
      <IconMessages size={40} stroke={1.5} aria-hidden />
      <p>Выберите переписку слева</p>
    </div>
  );
}
