'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient } from "@/globals/actionClient";
import { aiIdSchema, postEditStartDto } from "@/domains/posts/dto/postRequests";
import { transitPost } from "@/domains/posts/policy";
import { changePostStatus } from "@/domains/posts/shared/changePostStatus";
import { POST_EDIT_TRANSITIONS, PostOwnerTransition } from "@/domains/posts/shared/postStatuses";
import { redirect } from "next/navigation";

/*
  Переходы, которые делает автор поста (или admin). Модерация — в postModerationActions.
*/

export const submitPostAction = ownerTransitionAction('submit');

export const withdrawPostAction = ownerTransitionAction('withdraw');

export const unpublishPostAction = ownerTransitionAction('unpublish');

export const archivePostAction = ownerTransitionAction('archive');

export const restorePostAction = ownerTransitionAction('restore');

/*
  «Изменить» вне черновика (спека 25): переход в черновик по статусу, который видел автор,
  затем форма. Статус сменился — changePostStatus вернёт 409
*/
export const editPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postEditStartDto)
  .action(async ({ parsedInput: { status }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    const transition = POST_EDIT_TRANSITIONS[status];
    await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, transition));

    changePostStatus(post.id, transition, auth.id);

    return redirect(`/office/posts/${post.id}/edit`);
  });

function ownerTransitionAction(transition: PostOwnerTransition){
  return actionAuthClient
    .bindArgsSchemas([ aiIdSchema ])
    .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
      const post = await CONTAINER.postService.findOrFail(id);
      await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, transition));

      changePostStatus(post.id, transition, auth.id);

      return redirect(`/office/posts/${post.id}`);
    });
}
