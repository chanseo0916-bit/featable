import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoryBlock } from "@/lib/types";
import { sendInterviewTeaserEmail } from "@/lib/email/interview";

interface DeliveryRow { id: string; campaign_id: string; user_id: string; email: string; display_name: string | null; }
interface CampaignRow { id: string; feature_id: string; }
interface FeatureRow { id: string; slug: string; title: string; excerpt: string; cover_url: string | null; hook_intro: string | null; hook_label: string | null; body: StoryBlock[] | null; }

export async function processInterviewEmailQueue(limit = 50) {
  const admin = createAdminClient();
  if (!admin) return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  await admin.from("interview_email_deliveries").update({ status: "queued", error: "recovered_after_timeout", updated_at: new Date().toISOString() }).eq("status", "sending").lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
  const { data } = await admin.from("interview_email_deliveries").select("id,campaign_id,user_id,email,display_name").eq("status", "queued").order("created_at").limit(limit);
  const deliveries = (data ?? []) as DeliveryRow[];
  if (!deliveries.length) return { processed: 0, sent: 0, failed: 0, skipped: 0 };

  const campaignIds = [...new Set(deliveries.map((row) => row.campaign_id))];
  const userIds = [...new Set(deliveries.map((row) => row.user_id))];
  const [{ data: campaignData }, { data: consentData }] = await Promise.all([
    admin.from("interview_email_campaigns").select("id,feature_id").in("id", campaignIds),
    admin.from("profiles").select("id,email,full_name,marketing_agreed_at").in("id", userIds).not("marketing_agreed_at", "is", null),
  ]);
  const campaigns = (campaignData ?? []) as CampaignRow[];
  const featureIds = [...new Set(campaigns.map((row) => row.feature_id))];
  const { data: featureData } = featureIds.length
    ? await admin.from("features").select("id,slug,title,excerpt,cover_url,hook_intro,hook_label,body").in("id", featureIds).eq("kind", "interview").eq("status", "published")
    : { data: [] };
  const features = (featureData ?? []) as FeatureRow[];
  const campaignMap = new Map(campaigns.map((row) => [row.id, row]));
  const featureMap = new Map(features.map((row) => [row.id, row]));
  const consentMap = new Map((consentData ?? []).map((row) => [row.id, row]));
  const now = new Date().toISOString();

  await Promise.all([
    admin.from("interview_email_deliveries").update({ status: "sending", updated_at: now }).in("id", deliveries.map((row) => row.id)).eq("status", "queued"),
    admin.from("interview_email_campaigns").update({ status: "sending", started_at: now, updated_at: now }).in("id", campaignIds),
  ]);

  const results = await Promise.all(deliveries.map(async (delivery) => {
    const profile = consentMap.get(delivery.user_id);
    if (!profile?.email) {
      await admin.from("interview_email_deliveries").update({ status: "skipped", error: "marketing_consent_withdrawn", updated_at: new Date().toISOString() }).eq("id", delivery.id);
      return "skipped" as const;
    }
    const campaign = campaignMap.get(delivery.campaign_id);
    const feature = campaign ? featureMap.get(campaign.feature_id) : null;
    if (!feature) {
      await admin.from("interview_email_deliveries").update({ status: "failed", error: "interview_not_available", updated_at: new Date().toISOString() }).eq("id", delivery.id);
      return "failed" as const;
    }
    const result = await sendInterviewTeaserEmail({ deliveryId: delivery.id, email: profile.email, displayName: profile.full_name || delivery.display_name, title: feature.title, excerpt: feature.excerpt, coverUrl: feature.cover_url, hookIntro: feature.hook_intro, hookLabel: feature.hook_label, body: feature.body ?? [] });
    if (!result.ok) {
      await admin.from("interview_email_deliveries").update({ status: "failed", error: result.error, updated_at: new Date().toISOString() }).eq("id", delivery.id);
      return "failed" as const;
    }
    await admin.from("interview_email_deliveries").update({ status: "sent", provider_message_id: result.id ?? null, error: null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", delivery.id);
    return "sent" as const;
  }));

  await Promise.all(campaignIds.map(async (campaignId) => {
    const [{ count: sent }, { count: failed }, { count: remaining }] = await Promise.all([
      admin.from("interview_email_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent"),
      admin.from("interview_email_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "failed"),
      admin.from("interview_email_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", ["queued", "sending"]),
    ]);
    const complete = (remaining ?? 0) === 0;
    await admin.from("interview_email_campaigns").update({ status: complete ? (sent ? "completed" : "failed") : "queued", sent_count: sent ?? 0, failed_count: failed ?? 0, completed_at: complete ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", campaignId);
  }));

  return { processed: results.length, sent: results.filter((value) => value === "sent").length, failed: results.filter((value) => value === "failed").length, skipped: results.filter((value) => value === "skipped").length };
}

export async function queueInterviewCampaign(featureId: string, adminUserId: string) {
  const admin = createAdminClient();
  if (!admin) return { error: "메일 발송 환경변수가 준비되지 않았습니다." };
  const { data: feature } = await admin.from("features").select("id,slug,title,kind,status").eq("id", featureId).maybeSingle();
  if (!feature || feature.kind !== "interview" || feature.status !== "published") return { error: "공개된 인터뷰만 발송할 수 있습니다." };
  let { data: campaign } = await admin.from("interview_email_campaigns").select("id,status").eq("feature_id", featureId).maybeSingle();
  if (!campaign) {
    const created = await admin.from("interview_email_campaigns").insert({ feature_id: featureId, created_by: adminUserId, status: "queued" }).select("id,status").single();
    if (created.error || !created.data) return { error: "발송 캠페인을 만들지 못했습니다. migration 42를 확인해주세요." };
    campaign = created.data;
  }

  const [{ data: recipients }, { data: existing }] = await Promise.all([
    admin.from("profiles").select("id,email,full_name").not("marketing_agreed_at", "is", null).not("email", "is", null),
    admin.from("interview_email_deliveries").select("user_id").eq("campaign_id", campaign.id),
  ]);
  const existingUsers = new Set((existing ?? []).map((row) => row.user_id));
  const fresh = (recipients ?? []).filter((row) => row.email && !existingUsers.has(row.id));
  if (fresh.length) {
    const { data: inserted, error } = await admin.from("interview_email_deliveries").insert(fresh.map((row) => ({ campaign_id: campaign.id, user_id: row.id, email: row.email, display_name: row.full_name, status: "queued" }))).select("id,user_id");
    if (error) return { error: "수신자 목록을 만들지 못했습니다." };
    if (inserted?.length) await admin.from("notifications").insert(inserted.map((row) => ({ user_id: row.user_id, actor_id: adminUserId, type: "system", title: "새로운 Founder 인터뷰가 공개됐어요", message: feature.title, href: `/stories/${feature.slug}`, data: { kind: "interview_published", feature_id: featureId, delivery_id: row.id } })));
  }
  await admin.from("interview_email_deliveries").update({ status: "queued", error: null, updated_at: new Date().toISOString() }).eq("campaign_id", campaign.id).eq("status", "failed");
  const { count } = await admin.from("interview_email_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id);
  await admin.from("interview_email_campaigns").update({ status: "queued", recipient_count: count ?? 0, completed_at: null, updated_at: new Date().toISOString() }).eq("id", campaign.id);
  if (!count) {
    await admin.from("interview_email_campaigns").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
    return { message: "마케팅 수신에 동의한 회원이 아직 없습니다." };
  }
  const result = await processInterviewEmailQueue(50);
  return { message: `${result.sent}명에게 발송했습니다.${(count ?? 0) > result.processed ? ` 나머지는 자동 발송 대기 중입니다.` : ""}` };
}
