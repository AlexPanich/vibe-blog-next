import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

type EmptyStateProps = { icon: Icon, title?: string, children: ReactNode, action?: ReactNode }

/*
  Пустое место «о себе»: что сделать дальше, а не констатация. Без пометок server/client —
  нужен и серверным страницам, и клиентским спискам (DialogList). Очереди модерации и
  админка его не используют: там пустота значит «работы нет», другой тон (спека 27)
*/
export default function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <Icon size={26} stroke={1.6} />
      <div className="ui-empty__body">
        { title && <p className="ui-empty__title">{ title }</p> }
        <p>{ children }</p>
        { action && <div className="ui-empty__actions">{ action }</div> }
      </div>
    </div>
  );
}
