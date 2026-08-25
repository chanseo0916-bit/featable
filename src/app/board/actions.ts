"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isBoardAuthorVisibility,
  isBoardCategory,
  type BoardAuthorVisibility,
  type BoardCategory,
} from "@/lib/board";
import { processBoardImageCleanup } from "@/lib/board-images-admin";
import { createClient } from "@/lib/supabase/server";

const POST_ERROR = "게시글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.";
const POST_UPDATE_ERROR = "게시글을 수정하지 못했습니다. 잠시 후 다시 시도해주세요.";
const COMMENT_ERROR = "댓글을 등록하지 못했습니다. 잠시 후 다시 시도해주세요.";
const LIKE_ERROR = "좋아요를 반영하지 못했습니다. 잠시 후 다시 시도해주세요.";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOARD_IMAGE_LIMIT = 5;

type BoardPostFormInput = {
  category: BoardCategory;
  authorVisibility: BoardAuthorVisibility;
  title: string;
  body: string;
  imageIds: string[];
};

export type BoardDeleteResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readImageIds(formData: FormData):
  | { ok: true; imageIds: string[] }
  | { ok: false; error: string } {
  const values = formData.getAll("imageId");
  if (values.length > BOARD_IMAGE_LIMIT) {
    return { ok: false, error: `이미지는 최대 ${BOARD_IMAGE_LIMIT}장까지 첨부할 수 있습니다.` };
  }

  const imageIds: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
      return { ok: false, error: "첨부 이미지를 다시 확인해주세요." };
    }
    imageIds.push(value.trim());
  }
  if (new Set(imageIds).size !== imageIds.length) {
    return { ok: false, error: "같은 이미지가 중복으로 첨부되었습니다." };
  }
  return { ok: true, imageIds };
}

function missingBoardImageRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    message.includes("Could not find the function") ||
    message.includes("does not exist")
  );
}

function boardImageErrorMessage(error: { message?: string; details?: string } | null): string {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`;
  if (message.includes("board_images_too_many")) {
    return `이미지는 최대 ${BOARD_IMAGE_LIMIT}장까지 첨부할 수 있습니다.`;
  }
  if (message.includes("board_images_invalid")) {
    return "첨부 이미지가 만료되었거나 소유권을 확인할 수 없습니다. 다시 첨부해주세요.";
  }
  if (message.includes("board_post_not_owned")) {
    return "수정할 수 없는 게시글입니다.";
  }
  return "첨부 이미지를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.";
}

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function postErrorRedirect(message = POST_ERROR): never {
  errorRedirect("/board/write", message);
}

function editPostErrorRedirect(postId: string, message = POST_UPDATE_ERROR): never {
  errorRedirect(`/board/${encodeURIComponent(postId)}/edit`, message);
}

function commentErrorRedirect(postId: string, message = COMMENT_ERROR): never {
  errorRedirect(`/board/${encodeURIComponent(postId)}`, message);
}

function likeErrorRedirect(postId: string, message = LIKE_ERROR): never {
  redirect(
    `/board/${encodeURIComponent(postId)}?likeError=${encodeURIComponent(message)}#board-post-reactions`,
  );
}

function parseBoardPostForm(formData: FormData):
  | { ok: true; data: BoardPostFormInput }
  | { ok: false; error: string } {
  const category = readText(formData, "category");
  const authorVisibility = readText(formData, "authorVisibility");
  const title = readText(formData, "title");
  const body = readText(formData, "body");
  const images = readImageIds(formData);

  if (!isBoardCategory(category)) {
    return { ok: false, error: "카테고리를 다시 선택해주세요." };
  }
  if (!isBoardAuthorVisibility(authorVisibility)) {
    return { ok: false, error: "작성자 표시 방식을 다시 선택해주세요." };
  }
  if (title.length < 2 || title.length > 120) {
    return { ok: false, error: "제목은 2자 이상 120자 이하로 입력해주세요." };
  }
  if (body.length < 1 || body.length > 10000) {
    return { ok: false, error: "본문은 1자 이상 10,000자 이하로 입력해주세요." };
  }
  if (!images.ok) return images;

  return {
    ok: true,
    data: { category, authorVisibility, title, body, imageIds: images.imageIds },
  };
}

function revalidateBoardMutation(postId: string) {
  revalidatePath("/board");
  revalidatePath(`/board/${postId}`);
  revalidatePath(`/board/${postId}/edit`);
  revalidatePath("/admin/board");
  revalidatePath(`/admin/board/${postId}`);
}

/** 로그인한 프로필만 게시글을 작성할 수 있습니다. DB RLS가 최종 권한을 강제합니다. */
export async function createBoardPost(formData: FormData): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent("/board/write")}`);

  const parsed = parseBoardPostForm(formData);
  if (!parsed.ok) postErrorRedirect(parsed.error);

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_board_post_with_images",
    {
      p_category: parsed.data.category,
      p_author_visibility: parsed.data.authorVisibility,
      p_title: parsed.data.title,
      p_body: parsed.data.body,
      p_image_ids: parsed.data.imageIds,
    },
  );

  let postId = typeof rpcData === "string" && UUID_PATTERN.test(rpcData) ? rpcData : "";
  if (rpcError && missingBoardImageRpc(rpcError) && parsed.data.imageIds.length === 0) {
    const { data, error } = await supabase
      .from("board_posts")
      .insert({
        author_id: user.id,
        author_visibility: parsed.data.authorVisibility,
        category: parsed.data.category,
        title: parsed.data.title,
        body: parsed.data.body,
      })
      .select("id")
      .single();
    if (error || !data?.id) postErrorRedirect();
    postId = data.id;
  } else if (rpcError || !postId) {
    console.error("[board] Failed to create a post with images.", rpcError);
    postErrorRedirect(boardImageErrorMessage(rpcError));
  }

  revalidatePath("/board");
  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}

/** 작성자만 자신의 게시글 내용을 수정할 수 있으며 소유권은 RLS가 재검증합니다. */
export async function updateBoardPost(formData: FormData): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postId = readText(formData, "postId");
  if (!UUID_PATTERN.test(postId)) errorRedirect("/board", POST_UPDATE_ERROR);
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/board/${postId}/edit`)}`);
  }

  const parsed = parseBoardPostForm(formData);
  if (!parsed.ok) editPostErrorRedirect(postId, parsed.error);

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "update_board_post_with_images",
    {
      p_post_id: postId,
      p_category: parsed.data.category,
      p_author_visibility: parsed.data.authorVisibility,
      p_title: parsed.data.title,
      p_body: parsed.data.body,
      p_image_ids: parsed.data.imageIds,
    },
  );

  if (rpcError && missingBoardImageRpc(rpcError) && parsed.data.imageIds.length === 0) {
    const { data, error } = await supabase
      .from("board_posts")
      .update({
        author_visibility: parsed.data.authorVisibility,
        category: parsed.data.category,
        title: parsed.data.title,
        body: parsed.data.body,
      })
      .eq("id", postId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[board] Failed to update own post.", error);
      editPostErrorRedirect(postId);
    }
    if (!data) editPostErrorRedirect(postId, "수정할 수 없는 게시글입니다.");
  } else if (rpcError) {
    console.error("[board] Failed to update a post with images.", rpcError);
    editPostErrorRedirect(postId, boardImageErrorMessage(rpcError));
  } else {
    const result = rpcData && typeof rpcData === "object"
      ? rpcData as Record<string, unknown>
      : null;
    const removedPaths = Array.isArray(result?.removed_paths)
      ? result.removed_paths.filter((path): path is string => typeof path === "string")
      : [];
    if (removedPaths.length > 0) {
      await processBoardImageCleanup({ paths: removedPaths });
    }
  }

  revalidateBoardMutation(postId);
  redirect(`/board/${postId}`);
}

/** 작성자만 자신의 게시글을 삭제할 수 있으며 댓글·좋아요·신고도 함께 정리됩니다. */
export async function deleteOwnBoardPost(input: {
  postId: string;
}): Promise<BoardDeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.postId !== "string" ||
    !UUID_PATTERN.test(input.postId.trim())
  ) {
    return { ok: false, error: "게시글 식별자를 확인해주세요." };
  }

  const postId = input.postId.trim();
  const { data, error } = await supabase
    .from("board_posts")
    .delete()
    .eq("id", postId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[board] Failed to delete own post.", error);
    return { ok: false, error: "게시글을 삭제하지 못했습니다." };
  }
  if (!data) return { ok: false, error: "삭제할 수 없는 게시글입니다." };

  await processBoardImageCleanup();

  revalidateBoardMutation(postId);
  return { ok: true, message: "게시글을 삭제했습니다." };
}

/** 댓글 삭제는 부모 게시글부터 잠그는 DB 함수에서 작성자 소유권을 확인합니다. */
export async function deleteOwnBoardComment(input: {
  postId: string;
  commentId: string;
}): Promise<BoardDeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.postId !== "string" ||
    typeof input.commentId !== "string" ||
    !UUID_PATTERN.test(input.postId.trim()) ||
    !UUID_PATTERN.test(input.commentId.trim())
  ) {
    return { ok: false, error: "댓글 식별자를 확인해주세요." };
  }

  const postId = input.postId.trim();
  const commentId = input.commentId.trim();
  const { data, error } = await supabase.rpc("delete_own_board_comment", {
    p_post_id: postId,
    p_comment_id: commentId,
  });

  if (error) {
    console.error("[board] Failed to delete own comment.", error);
    return { ok: false, error: "댓글을 삭제하지 못했습니다." };
  }
  if (data !== true) return { ok: false, error: "삭제할 수 없는 댓글입니다." };

  revalidateBoardMutation(postId);
  return { ok: true, message: "댓글을 삭제했습니다." };
}

/** 로그인한 프로필만 게시글에 댓글을 작성할 수 있습니다. DB RLS가 최종 권한을 강제합니다. */
export async function createBoardComment(formData: FormData): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postId = readText(formData, "postId") || readText(formData, "post_id");
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(postId ? `/board/${postId}` : "/board")}`);
  }
  if (!UUID_PATTERN.test(postId)) {
    errorRedirect("/board", COMMENT_ERROR);
  }

  const body = readText(formData, "body");
  const authorVisibility = readText(formData, "authorVisibility");
  if (!isBoardAuthorVisibility(authorVisibility)) {
    commentErrorRedirect(postId, "댓글 작성자 표시 방식을 선택해주세요.");
  }
  if (body.length < 1 || body.length > 1000) {
    commentErrorRedirect(postId, "댓글은 1자 이상 1,000자 이하로 입력해주세요.");
  }

  const { error } = await supabase.from("board_comments").insert({
    post_id: postId,
    author_id: user.id,
    author_visibility: authorVisibility,
    body,
  });

  if (error) {
    console.error("[board] Failed to create comment.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    commentErrorRedirect(postId);
  }

  revalidatePath("/board");
  revalidatePath(`/board/${postId}`);
  redirect(`/board/${postId}`);
}

/** 좋아요는 사용자·게시글 조합당 하나이며, 같은 의도를 다시 보내도 결과가 같습니다. */
export async function setBoardPostLike(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postId = readText(formData, "postId") || readText(formData, "post_id");
  if (!UUID_PATTERN.test(postId)) errorRedirect("/board", LIKE_ERROR);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/board/${postId}`)}`);

  const intent = readText(formData, "intent");
  if (intent !== "like" && intent !== "unlike") likeErrorRedirect(postId);

  if (intent === "like") {
    const { error } = await supabase.from("board_post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });
    if (error && error.code !== "23505") likeErrorRedirect(postId);
  } else {
    const { error } = await supabase
      .from("board_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) likeErrorRedirect(postId);
  }

  revalidatePath("/board");
  revalidatePath(`/board/${postId}`);
}
