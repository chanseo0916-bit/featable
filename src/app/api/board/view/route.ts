import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIEWER_COOKIE = "featable_board_viewer";

type BoardViewBody = {
  postId?: unknown;
};

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function responseWithViewerCookie(viewerKey: string, shouldSetCookie: boolean) {
  const response = new NextResponse(null, { status: 204 });
  if (shouldSetCookie) {
    response.cookies.set(VIEWER_COOKIE, viewerKey, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  let body: BoardViewBody;
  try {
    const parsed = await request.json();
    body = parsed !== null && typeof parsed === "object"
      ? (parsed as BoardViewBody)
      : {};
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!validUuid(body.postId)) {
    return NextResponse.json({ error: "invalid post id" }, { status: 400 });
  }

  const existingViewerKey = request.cookies.get(VIEWER_COOKIE)?.value;
  const hasValidViewerKey = validUuid(existingViewerKey);
  const viewerKey = hasValidViewerKey ? existingViewerKey : crypto.randomUUID();
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "board views are not configured" }, { status: 503 });
  }

  const { error } = await admin.rpc("record_board_post_view", {
    p_post_id: body.postId.trim(),
    p_viewer_key: viewerKey,
  });
  if (error) {
    return NextResponse.json({ error: "board views are not ready" }, { status: 503 });
  }

  return responseWithViewerCookie(viewerKey, !hasValidViewerKey);
}
