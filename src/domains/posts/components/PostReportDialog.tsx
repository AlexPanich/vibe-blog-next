'use client'

import 'client-only';
import { fieldError } from "@/components/general/FieldError";
import { showToast } from "@/components/general/showToast";
import useForm from "@/hooks/useForm";
import { POST_REPORT_REASONS, type PostReportReason } from "@/database/schema";
import { reportPostAction } from "@/domains/posts/actions/postReportActions";
import { POST_REPORT_COMMENT_MAX } from "@/domains/posts/dto/postReportRequests";
import type { PostReportState } from "@/domains/posts/dto/postResources";
import { POST_REPORT_REASON_LABELS } from "@/domains/posts/shared/postReportReasons";
import { Button, Group, Modal, Radio, RadioGroup, Stack, Text, Textarea } from "@mantine/core";
import { IconFlag } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";

type PostReportDialogProps = {
  postId: number,
  title: string,
  opened: boolean,
  onClose: () => void,
  onSent: (state: PostReportState) => void
}

type PostReportForm = {
  reason: PostReportReason | '',
  comment: string
}

/*
  Диалог жалобы на пост (спека 36): причина из списка и комментарий до 500 символов — для
  «Другое» обязателен. После отправки — тост, кнопка переходит в «Жалоба отправлена»
*/
export default function PostReportDialog({ postId, title, opened, onClose, onSent }: PostReportDialogProps) {
  const { data, update } = useForm<PostReportForm>({ reason: '', comment: '' });
  const report = useAction(reportPostAction.bind(null, postId), {
    onSuccess: ({ data: result }) => {
      onClose();
      showToast({ id: `post-report-${postId}`, icon: <IconFlag size={18} />, title: 'Жалоба отправлена', text: 'Модератор её рассмотрит', href: null });
      onSent(result.state);
    }
  });
  const errors = report.result.validationErrors;

  function submit(){
    if(data.reason !== ''){
      report.execute({ reason: data.reason, comment: data.comment });
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Пожаловаться на пост">
      <form onSubmit={e => { e.preventDefault(); submit() }}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            «{ title }». Модератор увидит причину и ваш комментарий, автор поста о жалобе не узнает.
          </Text>

          <RadioGroup
            label="Что не так"
            value={data.reason}
            onChange={value => update('reason', value as PostReportReason)}
            error={fieldError(errors, 'reason')}
          >
            <Stack gap="xs" mt="xs">
              { POST_REPORT_REASONS.map(r => <Radio key={r} value={r} label={POST_REPORT_REASON_LABELS[r]} />) }
            </Stack>
          </RadioGroup>

          <Textarea
            label="Комментарий"
            description={`${data.comment.length} / ${POST_REPORT_COMMENT_MAX}`}
            inputWrapperOrder={[ 'label', 'input', 'description', 'error' ]}
            value={data.comment}
            onChange={e => update('comment', e.target.value)}
            withAsterisk={data.reason === 'other'}
            error={fieldError(errors, 'comment')}
            autosize
            minRows={3}
            maxRows={8}
          />

          { report.result.serverError && <Text size="sm" c="red">{ report.result.serverError.message }</Text> }

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="ui-ink-button" disabled={data.reason === ''} loading={report.isPending}>Отправить</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
