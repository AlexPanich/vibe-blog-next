import { CONTAINER } from "@/globals/container";
import { resource } from "@/core/resource";
import CommentReportRow from "@/domains/comments/components/CommentReportRow";
import { commentReportRowResource } from "@/domains/comments/dto/commentResources";
import { moderateComments } from "@/domains/comments/policy";
import { loadCommentReports } from "@/domains/comments/shared/loadCommentReports";
import { requireAuthUser } from "@/shared/auth";
import { IconChecks } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Жалобы' };

export default async function ModerationComments() {
  await CONTAINER.boucerService.breakIfCant(moderateComments);

  const user = await requireAuthUser();
  const rows = await loadCommentReports();

  return (
    <>
      <div className="ui-section-head">
        <h1 className="ui-title">Жалобы</h1>
        <span className="ui-kicker">Комментариев: { rows.length }</span>
      </div>

      { rows.length === 0 ? (
        <div className="ui-empty">
          <IconChecks size={26} stroke={1.6} />
          <p>Жалоб нет.</p>
        </div>
      ) : (
        <div className="ui-rows">
          { rows.map(row => <CommentReportRow
            key={row.commentId}
            row={resource(commentReportRowResource, row)}
            own={row.author.id === user.id}
            adminLink={user.roles.includes('admin')}
          />) }
        </div>
      ) }
    </>
  );
}
