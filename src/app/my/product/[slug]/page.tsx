import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioBrand } from "@/components/site-shell";
import { ProductRegistrationForm } from "@/app/submit/product-form";
import type { StoryBlock } from "@/lib/types";
import { loadProductDraft } from "@/app/submit/actions";

export const metadata: Metadata = { title: "프로덕트 수정 · FEATABLE", robots: { index: false, follow: false } };

export default async function ProductEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/product/${slug}`);
  const { data: product } = await supabase.from("products").select("id,brand_id,slug,name,tagline,category,problem,solution,features,price,official_url,hero_url,story,status,seo_title,seo_description,primary_keyword,secondary_keywords,og_image_url").eq("slug", slug).maybeSingle();
  if (!product) notFound();
  const { data: brand } = await supabase.from("brands").select("id,name,founder_id").eq("id", product.brand_id).maybeSingle();
  if (!brand) notFound();
  const [{ data: owner }, { data: membership }] = await Promise.all([
    supabase.from("founders").select("id").eq("id", brand.founder_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("brand_members").select("member_role").eq("brand_id", brand.id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!owner && membership?.member_role !== "editor") notFound();
  const saved = await loadProductDraft(`edit:${product.id}`);
  const persisted = saved?.draft;

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">프로덕트 수정</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page product-registration-page"><div className="shell"><ProductRegistrationForm brands={[{ id: brand.id, name: brand.name }]} initialBrandId={product.brand_id} editProductId={product.id} draftKey={`edit:${product.id}`} initialSavedAt={saved?.savedAt} initial={persisted ?? { brandId: product.brand_id, slug: product.slug, name: product.name, tagline: product.tagline, category: product.category, problem: product.problem, solution: product.solution, features: (product.features ?? []).join("\n"), price: product.price ?? "", officialUrl: product.official_url ?? "", heroUrl: product.hero_url ?? "", story: (product.story ?? []) as StoryBlock[], seoTitle: product.seo_title ?? "", seoDescription: product.seo_description ?? "", primaryKeyword: product.primary_keyword ?? "", secondaryKeywords: (product.secondary_keywords ?? []).join(", "), ogImageUrl: product.og_image_url ?? "", published: product.status === "published" }} /></div></main>
  </>;
}
