import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitWizard, type WizardInitial } from "@/app/submit/wizard";
import type { StoryBlock } from "@/lib/types";
import { StudioBrand } from "@/components/site-shell";

export const metadata: Metadata = { title: "브랜드 수정 · FEATABLE STUDIO", robots: { index: false, follow: false } };

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/edit/${slug}`);

  const { data: brand } = await supabase.from("brands").select("id,founder_id,slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,status,updated_at").eq("slug", slug).maybeSingle();
  if (!brand) notFound();
  const { data: founder } = await supabase.from("founders").select("id,user_id,name,headline,bio").eq("id", brand.founder_id).maybeSingle();
  // 본인 소유 브랜드만 편집 화면 진입 가능 (RLS는 저장만 막으므로 노출도 차단)
  if (!founder || founder.user_id !== user.id) notFound();
  const { data: product } = await supabase.from("products").select("id,slug,name,hero_url,tagline,story,problem,solution,features,price,official_url").eq("brand_id", brand.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!product) redirect("/submit");

  const initial: WizardInitial = {
    brandName: brand.name, brandSlug: brand.slug, category: brand.category, tagline: brand.tagline,
    founderName: founder.name, founderHeadline: founder.headline, founderBio: founder.bio ?? "",
    description: brand.description, problem: brand.problem ?? "", audience: brand.audience ?? "", website: brand.website ?? "",
    instagram: (brand.sns as { instagram?: string } | null)?.instagram ?? "", foundedAt: brand.founded_at ?? "",
    productName: product.name, productSlug: product.slug, productTagline: product.tagline, productProblem: product.problem,
    productSolution: product.solution, productFeatures: (product.features ?? []).join("\n"), story: (product.story ?? []) as StoryBlock[],
    price: product.price ?? "", officialUrl: product.official_url ?? "", logoUrl: brand.logo_url ?? "", coverUrl: brand.cover_url ?? "", heroUrl: product.hero_url ?? "",
  };

  return <>
    <div className="publish-console-nav"><div className="shell"><StudioBrand /><nav><Link href="/my">대시보드</Link><a className="active" href="#editor" data-submit-step="0">브랜드 수정</a><a href="#editor" data-submit-step="3">상세페이지</a><a href="#editor" data-submit-step="4">공개 설정</a></nav><Link href="/my">워크스페이스로 →</Link></div></div>
    <div className="publish-console-tabs"><div className="shell"><Link href="/my">워크스페이스 홈</Link><a className="active" href="#editor">{brand.name} 편집</a><Link href={`/brands/${brand.slug}`}>공개 페이지 바로가기 ↗</Link></div></div>
    <main className="submit-page"><SubmitWizard initial={initial} initialSavedAt={Date.parse(brand.updated_at) || 0} edit={{ brandId: brand.id, productId: product.id, published: brand.status === "published" }} /></main>
  </>;
}
