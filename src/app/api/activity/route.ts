import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["page_view","signup","login","brand_created","product_published","story_published","event_created","partner_inquiry"]);
export async function POST(request: Request) {
  const admin = createAdminClient(); if (!admin) return new NextResponse(null, { status: 204 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }
  const eventName = typeof body.eventName === "string" ? body.eventName : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 500) : "/";
  if (!allowed.has(eventName) || sessionId.length < 8 || !path.startsWith("/")) return NextResponse.json({ error: "invalid event" }, { status: 400 });
  const auth = await createClient(); const { data: { user } } = await auth.auth.getUser();
  const url = new URL(request.url);
  const rawReferrer = request.headers.get("referer");
  let referrer: string | null = null;
  if (rawReferrer) {
    try { const parsed = new URL(rawReferrer); referrer = `${parsed.origin}${parsed.pathname}`.slice(0, 500); } catch { referrer = null; }
  }
  await admin.from("user_activity_events").insert({ user_id: user?.id ?? null, session_id: sessionId, event_name: eventName, path, referrer, source: typeof body.source === "string" ? body.source.slice(0, 120) : url.searchParams.get("utm_source"), medium: typeof body.medium === "string" ? body.medium.slice(0, 120) : null, campaign: typeof body.campaign === "string" ? body.campaign.slice(0, 160) : null, metadata: {} });
  return new NextResponse(null, { status: 204 });
}
