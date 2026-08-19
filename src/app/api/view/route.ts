import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ViewType = "product" | "feature";

type ViewRequestBody = {
  slug?: unknown;
  type?: unknown;
};

function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** ViewTracker가 페이지/feature 상세 진입 때 호출하는 조회수 API */
export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) return noContent();

  let body: ViewRequestBody;
  try {
    const parsed = await request.json();
    body = parsed !== null && typeof parsed === "object" ? (parsed as ViewRequestBody) : {};
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const type: ViewType = body.type === undefined ? "product" : (body.type as ViewType);

  if (!slug || slug.length > 200 || (type !== "product" && type !== "feature")) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  if (type === "feature") {
    // SQL 함수가 UPDATE를 원자적으로 수행하므로 동시 요청에서 증가분이 유실되지 않음
    const { error } = await admin.rpc("increment_feature_view_count", { p_slug: slug });
    if (error) {
      return NextResponse.json({ error: "feature views not ready" }, { status: 503 });
    }
    return noContent();
  }

  // 기존 product 조회수 동작은 그대로 유지
  const { data: product } = await admin
    .from("products")
    .select("id, view_count")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (product) {
    await admin
      .from("products")
      .update({ view_count: (product.view_count ?? 0) + 1 })
      .eq("id", product.id);
  }

  return noContent();
}

export async function GET(request: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ counts: {} });

  const type = new URL(request.url).searchParams.get("type");
  if (type !== "feature" && type !== "product") {
    return NextResponse.json({ counts: {} });
  }

  const { data: rows } = await admin
    .from(type === "feature" ? "features" : "products")
    .select("slug, view_count")
    .eq("status", "published");

  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    if (typeof row.slug === "string") {
      counts[row.slug] = typeof row.view_count === "number" ? row.view_count : 0;
    }
  }

  return NextResponse.json({ counts });
}
