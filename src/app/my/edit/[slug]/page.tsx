import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitWizard, type WizardInitial } from "@/app/submit/wizard";
import type { StoryBlock } from "@/lib/types";

export const metadata: Metadata = { title: "브랜드 수정 · FEATABLE STUDIO", robots: { index: false, follow: false } };

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/edit/${slug}`);

  const { data: founder } = await supabase.from("founders").select("id,name,headline,bio").eq("user_id", user.id).maybeSingle();
  if (!founder) notFound();
  const { data: brand } = await supabase.from("brands").select("id,slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,status").eq("slug", slug).eq("founder_id", founder.id).maybeSingle();
  if (!brand) notFound();
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
    <div className="publish-console-nav"><div className="shell"><strong><i>F</i> FEATABLE STUDIO</strong><nav><Link href="/my">대시보드</Link><a className="active" href="#editor">브랜드 수정</a><a href="#story">상세페이지</a><a href="#publish">공개 설정</a></nav><Link href="/my">워크스페이스로 →</Link></div></div>
    <div className="publish-console-tabs"><div className="shell"><Link href="/my">워크스페이스 홈</Link><a className="active" href="#editor">{brand.name} 편집</a><Link href={`/brands/${brand.slug}`}>공개 페이지 바로가기 ↗</Link></div></div>
    <main className="submit-page"><SubmitWizard initial={initial} edit={{ brandId: brand.id, productId: product.id, published: brand.status === "published" }} /></main>
  </>;
}
