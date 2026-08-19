import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";
import { SubmitWizard, type WizardInitial } from "@/app/submit/wizard";
import type { StoryBlock } from "@/lib/types";

export const metadata: Metadata = {
  title: "브랜드 수정",
  robots: { index: false, follow: false },
};

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/my/edit/${slug}`);

  const { data: founder } = await supabase
    .from("founders")
    .select("id, name, headline, bio")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!founder) notFound();

  // 본인 소유 브랜드만 (RLS + founder_id 조건 이중 보장)
  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id,slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,status",
    )
    .eq("slug", slug)
    .eq("founder_id", founder.id)
    .maybeSingle();
  if (!brand) notFound();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id,slug,name,hero_url,tagline,story,problem,solution,features,price,official_url",
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!product) redirect("/submit");

  const initial: WizardInitial = {
    brandName: brand.name,
    brandSlug: brand.slug,
    category: brand.category,
    tagline: brand.tagline,
    founderName: founder.name,
    founderHeadline: founder.headline,
    founderBio: founder.bio ?? "",
    description: brand.description,
    problem: brand.problem ?? "",
    audience: brand.audience ?? "",
    website: brand.website ?? "",
    instagram: (brand.sns as { instagram?: string } | null)?.instagram ?? "",
    foundedAt: brand.founded_at ?? "",
    productName: product.name,
    productSlug: product.slug,
    productTagline: product.tagline,
    productProblem: product.problem,
    productSolution: product.solution,
    productFeatures: (product.features ?? []).join("\n"),
    story: (product.story ?? []) as StoryBlock[],
    price: product.price ?? "",
    officialUrl: product.official_url ?? "",
    logoUrl: brand.logo_url ?? "",
    coverUrl: brand.cover_url ?? "",
    heroUrl: product.hero_url ?? "",
  };

  return (
    <>
      <Header />
      <main className="submit-page">
        <div className="submit-page-heading">
          <p>EDIT MODE</p>
          <h1>
            {brand.name}
            <br />
            페이지를 수정합니다.
          </h1>
          <span>
            수정 후 마지막 단계에서 다시 공개하면 즉시 반영됩니다. URL 주소는
            유지됩니다.
          </span>
        </div>
        <SubmitWizard
          initial={initial}
          edit={{ brandId: brand.id, productId: product.id }}
        />
      </main>
    </>
  );
}
