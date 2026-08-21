import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudioNav } from "../../studio-nav";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensurePublishingInvitationsForUser } from "@/lib/publishing-invitations";
import { PublishingEditor } from "./publishing-editor";
import type { PublishingProfileInput } from "./actions";

export const metadata: Metadata = { title: "승인된 프로필 등록", robots: { index: false, follow: false } };

export default async function ApprovedPublishingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect(`/login?next=/my/publishing/${encodeURIComponent(token)}`);
  await ensurePublishingInvitationsForUser(user.id, user.email);
  const admin = createAdminClient();
  if (!admin) notFound();
  const { data } = await admin.from("publishing_invitations").select("id,registration_type,invitee_email,user_id,draft_payload,status,expires_at,entity_id,inquiry:partnership_inquiries(organization,website,objective,message)").eq("token", token).maybeSingle();
  if (!data || data.user_id !== user.id) notFound();
  if (data.status === "expired" || new Date(data.expires_at).getTime() < Date.now()) redirect("/my?publishing=expired");
  if (data.status === "published") {
    if (data.registration_type === "community" && data.entity_id) {
      const { data: community } = await admin.from("communities").select("slug").eq("id", data.entity_id).maybeSingle();
      if (community) redirect(`/communities/${community.slug}`);
    }
    redirect("/partners");
  }
  const inquiry = data.inquiry as unknown as { organization: string; website: string | null; objective: string; message: string } | null;
  const saved = data.draft_payload && typeof data.draft_payload === "object" ? data.draft_payload as Partial<PublishingProfileInput> : {};
  const initial: PublishingProfileInput = {
    name: saved.name ?? inquiry?.organization ?? "",
    logoUrl: saved.logoUrl ?? "",
    field: saved.field ?? inquiry?.objective ?? "",
    intro: saved.intro ?? inquiry?.message?.slice(0, 180) ?? "",
    description: saved.description ?? inquiry?.message ?? "",
    website: saved.website ?? inquiry?.website ?? "",
    instagram: saved.instagram ?? "",
  };
  return <><StudioNav /><main className="approved-publishing-page"><div className="shell"><div className="approved-publishing-heading"><span>REGISTRATION APPROVED</span><h2>승인됐어요.<br />이제 직접 완성해주세요.</h2><p>정보는 언제든 임시저장할 수 있고, 공개하기 전까지 외부에 노출되지 않습니다.</p></div><PublishingEditor token={token} type={data.registration_type as "partner" | "community"} initial={initial} /></div></main></>;
}
