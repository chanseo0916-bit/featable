import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioNav } from "../../studio-nav";
import { PartnerEditor } from "./partner-editor";

export const metadata: Metadata = { title: "파트너 프로필 관리 · FEATABLE", robots: { index: false, follow: false } };

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/partners/${encodeURIComponent(id)}`);
  const { data } = await supabase.from("partners").select("id,name,logo_url,field,intro,description,href,status").eq("id", id).eq("owner_user_id", user.id).maybeSingle();
  if (!data) notFound();
  return <><StudioNav active="partners" /><main className="approved-publishing-page"><div className="shell"><div className="approved-publishing-heading"><div><span>PARTNER CENTER</span><h2>{data.name}</h2></div><p>공개 프로필과 외부 연결을 관리합니다.</p></div><PartnerEditor id={data.id} initial={{ name: data.name, logoUrl: data.logo_url, field: data.field ?? "", intro: data.intro ?? "", description: data.description ?? "", website: data.href, status: data.status === "hidden" ? "hidden" : "published" }} /></div></main></>;
}
