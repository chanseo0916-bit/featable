import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

export async function GET(_request: Request, { params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params;
  const admin = createAdminClient();
  if (!admin) return NextResponse.redirect(new URL("/stories", SITE_URL), 302);
  const { data: delivery } = await admin.from("interview_email_deliveries").select("id,campaign_id").eq("id", deliveryId).maybeSingle();
  if (!delivery) return NextResponse.redirect(new URL("/stories", SITE_URL), 302);
  const { data: campaign } = await admin.from("interview_email_campaigns").select("feature_id").eq("id", delivery.campaign_id).maybeSingle();
  const { data: feature } = campaign
    ? await admin.from("features").select("slug").eq("id", campaign.feature_id).eq("status", "published").maybeSingle()
    : { data: null };
  if (!feature) return NextResponse.redirect(new URL("/stories", SITE_URL), 302);
  await admin.from("interview_email_deliveries").update({ clicked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", delivery.id).is("clicked_at", null);
  const target = new URL(`/stories/${feature.slug}`, SITE_URL);
  target.searchParams.set("utm_source", "interview_email");
  target.searchParams.set("utm_medium", "email");
  target.searchParams.set("utm_campaign", feature.slug);
  return NextResponse.redirect(target, 302);
}
