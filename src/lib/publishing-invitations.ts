import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublishingRegistrationType = "partner" | "community";

interface InvitationRow {
  id: string;
  token: string;
  registration_type: PublishingRegistrationType;
  invitee_email: string;
  user_id: string | null;
  notification_id: string | null;
  status: "pending" | "editing" | "published" | "expired";
  expires_at: string;
}
function copy(type: PublishingRegistrationType, organization: string) {
  return type === "partner"
    ? {
        title: "파트너 등록이 승인됐어요",
        message: `${organization}의 파트너 프로필을 완성하고 공개해주세요.`,
      }
    : {
        title: "커뮤니티 등록이 승인됐어요",
        message: `${organization}의 커뮤니티 페이지를 완성하고 공개해주세요.`,
      };
}

async function attachNotification(
  supabase: SupabaseClient,
  invitation: InvitationRow,
  userId: string,
  organization: string,
) {
  if (invitation.notification_id) return invitation.notification_id;
  const content = copy(invitation.registration_type, organization);
  const href = `/my/publishing/${invitation.token}`;
  const { data, error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "system",
    title: content.title,
    message: content.message,
    href,
    data: {
      kind: "publishing_invitation",
      publishing_invitation_id: invitation.id,
      registration_type: invitation.registration_type,
      organization,
    },
  }).select("id").single();
  if (error || !data) throw new Error(error?.message || "알림 생성 실패");
  await supabase.from("publishing_invitations").update({
    user_id: userId,
    notification_id: data.id,
    claimed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", invitation.id);
  return data.id as string;
}

export async function issuePublishingInvitationWithClient(
  supabase: SupabaseClient,
  inquiry: {
    id: string;
    inquiry_type: "advertiser" | "community_partner";
    organization: string;
    contact_email: string;
    applicant_user_id: string | null;
  },
) {
  const registrationType: PublishingRegistrationType = inquiry.inquiry_type === "advertiser" ? "partner" : "community";
  const email = inquiry.contact_email.trim().toLowerCase();
  let { data: invitation, error } = await supabase
    .from("publishing_invitations")
    .select("id,token,registration_type,invitee_email,user_id,notification_id,status,expires_at")
    .eq("inquiry_id", inquiry.id)
    .maybeSingle();

  if (!invitation && !error) {
    const inserted = await supabase.from("publishing_invitations").insert({
      inquiry_id: inquiry.id,
      registration_type: registrationType,
      invitee_email: email,
    }).select("id,token,registration_type,invitee_email,user_id,notification_id,status,expires_at").single();
    invitation = inserted.data;
    error = inserted.error;
  }
  if (error || !invitation) return { ok: false as const, error: error?.message || "등록 초대권을 만들지 못했습니다." };

  let userId = inquiry.applicant_user_id;
  if (!userId) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    userId = profile?.id ?? null;
  }
  if (userId) {
    try { await attachNotification(supabase, invitation as InvitationRow, userId, inquiry.organization); }
    catch (notificationError) {
      return { ok: false as const, error: notificationError instanceof Error ? notificationError.message : "사이트 알림을 만들지 못했습니다." };
    }
  }
  return { ok: true as const, registrationType, linked: Boolean(userId), token: invitation.token as string };
}

export async function ensurePublishingInvitationsForUser(userId: string, email?: string | null) {
  const supabase = createAdminClient();
  if (!supabase) return;
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    await supabase.from("publishing_invitations").update({
      user_id: userId,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("invitee_email", normalizedEmail).is("user_id", null).in("status", ["pending", "editing"]);
  }
  const { data } = await supabase
    .from("publishing_invitations")
    .select("id,token,registration_type,invitee_email,user_id,notification_id,status,expires_at,inquiry:partnership_inquiries(organization)")
    .eq("user_id", userId)
    .in("status", ["pending", "editing"]);
  for (const raw of data ?? []) {
    const invitation = raw as unknown as InvitationRow & { inquiry: { organization: string } | null };
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await supabase.from("publishing_invitations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", invitation.id);
      continue;
    }
    if (!invitation.notification_id) {
      try { await attachNotification(supabase, invitation, userId, invitation.inquiry?.organization || "승인된 조직"); }
      catch (error) { console.error("[publishing-invitation] notification attach failed", error); }
    }
  }
}
