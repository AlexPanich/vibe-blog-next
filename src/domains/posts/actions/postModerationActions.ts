'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient } from "@/globals/actionClient";
import { postModerations } from "@/database/schema";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { postApproveDto, postBlockDto, postRejectDto, postUnblockDto } from "@/domains/posts/dto/postModerationRequests";
import { transitPost } from "@/domains/posts/policy";
import { reviewGuard } from "@/domains/posts/shared/reviewGuard";
import { changePostStatus } from "@/domains/posts/shared/changePostStatus";
import { redirect } from "next/navigation";

export const approvePostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postApproveDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    // Только роль: чужое ревью проверяет reviewGuard в том же UPDATE — устаревшая страница получит 409, а не 403
    await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, 'approve'));

    changePostStatus(post.id, 'approve', auth.id, tx => {
      tx.insert(postModerations).values({
        postId: post.id,
        userId: auth.id,
        decision: 'approved',
        comment: parsedInput.comment || null
      }).run();
    }, reviewGuard(auth));

    return redirect('/office/moderation/posts');
  });

export const rejectPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postRejectDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    // Только роль: чужое ревью проверяет reviewGuard в том же UPDATE — устаревшая страница получит 409, а не 403
    await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, 'reject'));

    changePostStatus(post.id, 'reject', auth.id, tx => {
      tx.insert(postModerations).values({
        postId: post.id,
        userId: auth.id,
        decision: 'rejected',
        comment: parsedInput.comment
      }).run();
    }, reviewGuard(auth));

    return redirect('/office/moderation/posts');
  });

export const blockPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postBlockDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    // Пост из архива блокируется своим переходом; если статус успел смениться, changePostStatus вернёт 409
    const transition = post.status === 'hidden' ? 'blockArchived' : 'block';
    await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, transition));

    changePostStatus(post.id, transition, auth.id, tx => {
      tx.insert(postModerations).values({
        postId: post.id,
        userId: auth.id,
        decision: 'blocked',
        comment: parsedInput.comment
      }).run();
    });

    return redirect(`/office/moderation/posts/${post.id}`);
  });

export const unblockPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postUnblockDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const post = await CONTAINER.postService.findOrFail(id);
    await CONTAINER.boucerService.breakIfCant(u => transitPost(u, post, 'unblock'));

    changePostStatus(post.id, 'unblock', auth.id, tx => {
      tx.insert(postModerations).values({
        postId: post.id,
        userId: auth.id,
        decision: 'unblocked',
        comment: parsedInput.comment || null
      }).run();
    });

    return redirect(`/office/moderation/posts/${post.id}`);
  });
