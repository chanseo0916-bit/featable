import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 프로덕트 조회수 +1. 클라이언트 ViewTracker가 페이지당 세션 1회 호출한다. */
export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({}, { status: 204 });

  let slug = "";
  try {
    const body = (await request.json()) as { slug?: string };
    slug = body.slug ?? "";
  } catch {
    // body 없음
  }
  if (!slug || typeof slug !== "string" || slug.length > 200) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  // published 제품만 카운트. 동시성으로 몇 회 유실될 수 있으나 MVP에서는 허용.
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

  return new NextResponse(null, { status: 204 });
}
