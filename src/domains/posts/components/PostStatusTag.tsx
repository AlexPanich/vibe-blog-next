import type { PostStatus } from "@/database/schema";
import { POST_STATUS_LABELS } from "@/domains/posts/shared/postStatuses";

export default function PostStatusTag({ status }: { status: PostStatus }) {
  return <span className="ui-status" data-status={status}>{ POST_STATUS_LABELS[status] }</span>;
}
