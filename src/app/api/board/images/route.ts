import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "board-images";
const CLEANUP_QUEUE_TABLE = "board_image_cleanup_queue";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_BYTES + 512 * 1024;
const MAX_PENDING_IMAGES = 20;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_PATH_PATTERN =
  /^board\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

type ImageFormat = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function detectImageFormat(file: File): Promise<ImageFormat | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

function isSafeBoardImagePath(path: string): boolean {
  return STORAGE_PATH_PATTERN.test(path);
}

async function enqueueCleanup(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  errorMessage: string,
) {
  if (!admin) return;
  const { error } = await admin.from(CLEANUP_QUEUE_TABLE).upsert(
    {
      storage_path: path,
      queued_at: new Date().toISOString(),
      processed_at: null,
      attempts: 0,
      last_attempt_at: null,
      last_error: errorMessage.slice(0, 500),
    },
    { onConflict: "storage_path" },
  );
  if (error) console.error("[board-images] Failed to enqueue cleanup retry.", error);
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("로그인이 필요합니다.", 401);

  const admin = createAdminClient();
  if (!admin) return jsonError("업로드 서비스를 사용할 수 없습니다.", 503);

  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    return jsonError("파일 크기를 확인할 수 없습니다.", 411);
  }
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError("사진은 5MB 이하로 올려주세요.", 413);
  }

  const { count: pendingCount, error: pendingCountError } = await admin
    .from("board_post_images")
    .select("id", { count: "exact", head: true })
    .eq("uploader_id", user.id)
    .eq("status", "pending");
  if (pendingCountError) {
    console.error("[board-images] Failed to check pending image quota.", pendingCountError);
    return jsonError("이미지 기능을 준비하고 있습니다. 잠시 후 다시 시도해주세요.", 503);
  }
  if ((pendingCount ?? 0) >= MAX_PENDING_IMAGES) {
    return jsonError("저장되지 않은 사진이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("파일을 읽지 못했습니다.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("사진을 선택해주세요.", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("사진은 5MB 이하로 올려주세요.", 413);
  }

  let format: ImageFormat | null;
  try {
    format = await detectImageFormat(file);
  } catch {
    return jsonError("이미지 파일을 읽지 못했습니다.", 400);
  }
  if (!format) return jsonError("JPG, PNG, WebP 이미지만 올릴 수 있습니다.", 415);

  const path = `board/${crypto.randomUUID()}.${format.extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: format.contentType,
    upsert: false,
  });

  if (uploadError) {
    console.error("[board-images] Failed to upload image.", uploadError);
    return jsonError("이미지를 업로드하지 못했습니다.", 500);
  }

  const { data: imageId, error: insertError } = await admin.rpc(
    "register_board_image_upload",
    {
      p_uploader_id: user.id,
      p_storage_path: path,
      p_mime_type: format.contentType,
      p_byte_size: file.size,
    },
  );

  if (insertError || typeof imageId !== "string" || !UUID_PATTERN.test(imageId)) {
    const { error: rollbackError } = await admin.storage.from(BUCKET).remove([path]);
    if (rollbackError) {
      console.error("[board-images] Failed to rollback uploaded image.", rollbackError);
      await enqueueCleanup(admin, path, rollbackError.message);
    }
    console.error("[board-images] Failed to record uploaded image.", insertError);
    if (`${insertError?.message ?? ""} ${insertError?.details ?? ""}`.includes("board_image_pending_limit")) {
      return jsonError("저장되지 않은 사진이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
    }
    return jsonError("이미지를 저장하지 못했습니다.", 500);
  }

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ id: imageId, url });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("로그인이 필요합니다.", 401);

  const admin = createAdminClient();
  if (!admin) return jsonError("삭제 서비스를 사용할 수 없습니다.", 503);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return jsonError("삭제할 이미지 정보를 확인해주세요.", 400);
  }

  const id =
    input && typeof input === "object" && "id" in input && typeof input.id === "string"
      ? input.id.trim()
      : "";
  if (!UUID_PATTERN.test(id)) return jsonError("이미지 식별자를 확인해주세요.", 400);

  const { data: image, error: selectError } = await admin
    .from("board_post_images")
    .select("id,uploader_id,storage_path,status")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (selectError) {
    console.error("[board-images] Failed to find image.", selectError);
    return jsonError("이미지를 확인하지 못했습니다.", 500);
  }
  if (!image) return jsonError("삭제할 수 없는 이미지입니다.", 404);
  if (image.uploader_id !== user.id) return jsonError("이 이미지를 삭제할 권한이 없습니다.", 403);
  if (typeof image.storage_path !== "string" || !isSafeBoardImagePath(image.storage_path)) {
    console.error("[board-images] Refusing to delete an unsafe storage path.", { id });
    return jsonError("이미지 경로를 확인하지 못했습니다.", 500);
  }

  const { data: deletedImage, error: deleteError } = await admin
    .from("board_post_images")
    .delete()
    .eq("id", id)
    .eq("uploader_id", user.id)
    .eq("status", "pending")
    .eq("storage_path", image.storage_path)
    .select("id,storage_path")
    .maybeSingle();
  if (deleteError) {
    console.error("[board-images] Failed to delete image record.", deleteError);
    return jsonError("이미지 기록을 정리하지 못했습니다.", 500);
  }
  if (!deletedImage) return jsonError("이미지가 이미 사용 중이거나 삭제되었습니다.", 409);

  const { error: storageError } = await admin.storage.from(BUCKET).remove([deletedImage.storage_path]);
  if (storageError) {
    console.error("[board-images] Failed to delete image from storage.", storageError);
    await enqueueCleanup(admin, deletedImage.storage_path, storageError.message);
    return NextResponse.json({ ok: true, cleanupPending: true });
  }

  await admin
    .from(CLEANUP_QUEUE_TABLE)
    .update({ processed_at: new Date().toISOString(), last_error: null })
    .eq("storage_path", deletedImage.storage_path)
    .is("processed_at", null);

  return NextResponse.json({ ok: true });
}
