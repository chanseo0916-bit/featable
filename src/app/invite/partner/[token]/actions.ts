"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function acceptPartnerInvitation(formData: FormData) {
  const token = String(formData.get("token") || "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/partner/${encodeURIComponent(token)}`);
  const admin = createAdminClient();
  if (!admin) redirect(`/invite/partner/${encodeURIComponent(token)}?error=unavailable`);

  const { data: invitation } = await admin.from("partner_invitations").select("id,partner_id,invitee_email,member_role,status,expires_at,invited_by").eq("token", token).maybeSingle();
  const loginEmail = user.email?.trim().toLowerCase();
  if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at).getTime() <= Date.now() || !loginEmail || invitation.invitee_email.trim().toLowerCase() !== loginEmail) {
    redirect(`/invite/partner/${encodeURIComponent(token)}?error=invalid`);
  }

  const { error } = await admin.from("partner_members").upsert({ partner_id: invitation.partner_id, user_id: user.id, member_role: invitation.member_role, invited_by: invitation.invited_by }, { onConflict: "partner_id,user_id" });
  if (error) redirect(`/invite/partner/${encodeURIComponent(token)}?error=save`);
  await admin.from("partner_invitations").update({ status: "accepted", invitee_user_id: user.id }).eq("id", invitation.id);
  ["/my", "/my/partners", `/my/partners/${invitation.partner_id}`, "/my/communities", "/my/jobs"].forEach((path) => revalidatePath(path));
  redirect(`/my/partners/${invitation.partner_id}?joined=1`);
}
