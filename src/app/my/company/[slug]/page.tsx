import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioBrand } from "@/components/site-shell";
import { BrandRegistrationForm } from "@/app/submit/brand-form";

export const metadata: Metadata = { title: "기업 정보 수정 · FEATABLE", robots: { index: false, follow: false } };

export default async function CompanyEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/company/${slug}`);
  const { data: brand } = await supabase.from("brands").select("id,founder_id,slug,name,tagline,category,description,website,logo_url").eq("slug", slug).maybeSingle();
  if (!brand) notFound();
  const [{ data: owner }, { data: membership }] = await Promise.all([
    supabase.from("founders").select("id").eq("id", brand.founder_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("brand_members").select("member_role").eq("brand_id", brand.id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!owner && membership?.member_role !== "editor") notFound();

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">기업 정보 수정</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page"><div className="shell"><BrandRegistrationForm editBrandId={brand.id} initial={{ name: brand.name, tagline: brand.tagline, category: brand.category, description: brand.description, website: brand.website ?? "", logoUrl: brand.logo_url ?? "" }} /></div></main>
  </>;
}
