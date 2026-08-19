"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";
import type { StoryBlock } from "@/lib/types";

export interface PublishInput {
  // STEP 1 — 기본정보
  brandName: string;
  brandSlug: string;
  category: string;
  tagline: string;
  // STEP 2 — Founder
  founderName: string;
  founderHeadline: string;
  founderBio?: string;
  // STEP 3 — Brand
  description: string;
  problem?: string;
  audience?: string;
  website?: string;
  instagram?: string;
  foundedAt?: string;
  // STEP 4 — Product
  productName: string;
  productSlug: string;
  productTagline: string;
  productProblem: string;
  productSolution: string;
  productFeatures: string[]; // 주요 특징
  story: StoryBlock[];
  price?: string;
  officialUrl?: string;
  // STEP 5 — 이미지 (업로드 후 public URL)
  logoUrl?: string;
  heroUrl?: string;
  // STEP 8 — 공개 여부
  publish: boolean;
}

export type PublishResult =
  | { ok: true; brandSlug: string; productSlug: string }
  | { ok: false; error: string };

/** unique 충돌 시 접미사를 붙여 1회 재시도하는 insert 헬퍼 */
async function insertWithSlugRetry<T extends { slug: string }>(
  insert: (row: T) => Promise<{ error: { code?: string } | null }>,
  row: T,
): Promise<{ slug: string } | { error: string }> {
  let { error } = await insert(row);
  if (error?.code === "23505") {
    const retried = { ...row, slug: `${row.slug}-${randomSuffix()}` };
    ({ error } = await insert(retried));
    if (!error) return { slug: retried.slug };
  }
  if (error) return { error: "저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  return { slug: row.slug };
}

export async function publishBrand(input: PublishInput): Promise<PublishResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 필수값 검증
  if (!input.brandName.trim() || !input.founderName.trim() || !input.productName.trim()) {
    return { ok: false, error: "브랜드명, 창업가 이름, 제품명은 필수입니다." };
  }

  const status = input.publish ? "published" : "draft";

  // 1) Founder upsert (계정당 1개)
  const { data: existingFounder } = await supabase
    .from("founders")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  let founderId: string;
  if (existingFounder) {
    founderId = existingFounder.id;
    await supabase
      .from("founders")
      .update({
        name: input.founderName.trim(),
        headline: input.founderHeadline.trim(),
        bio: input.founderBio?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", founderId);
  } else {
    const founderSlug =
      slugify(input.founderName) || `founder-${randomSuffix()}`;
    const { data: created, error } = await supabase
      .from("founders")
      .insert({
        user_id: user.id,
        slug: `${founderSlug}-${randomSuffix()}`,
        name: input.founderName.trim(),
        headline: input.founderHeadline.trim(),
        bio: input.founderBio?.trim() || null,
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: "창업가 프로필 생성에 실패했습니다." };
    }
    founderId = created.id;
  }

  // 2) Brand insert
  const brandSlug =
    slugify(input.brandSlug) || slugify(input.brandName) || `brand-${randomSuffix()}`;
  const brandRes = await insertWithSlugRetry(
    async (row) => {
      const { error } = await supabase.from("brands").insert(row);
      return { error };
    },
    {
      slug: brandSlug,
      founder_id: founderId,
      name: input.brandName.trim(),
      logo_url: input.logoUrl || null,
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      problem: input.problem?.trim() || null,
      audience: input.audience?.trim() || null,
      category: input.category,
      website: input.website?.trim() || null,
      sns: input.instagram ? { instagram: input.instagram.trim() } : {},
      founded_at: input.foundedAt?.trim() || null,
      status,
    } as never,
  );
  if ("error" in brandRes) return { ok: false, error: brandRes.error };

  // 3) 방금 만든 brand id 조회
  const { data: brand } = await supabase
    .from("brands")
    .select("id, slug")
    .eq("slug", brandRes.slug)
    .single();
  if (!brand) return { ok: false, error: "브랜드 저장 확인에 실패했습니다." };

  // 4) Product insert
  const productSlug =
    slugify(input.productSlug) || slugify(input.productName) || `product-${randomSuffix()}`;
  const storyImages = input.story
    .filter((block): block is Extract<StoryBlock, { type: "image" }> => block.type === "image")
    .map((block) => block.src)
    .filter(Boolean);
  const productRes = await insertWithSlugRetry(
    async (row) => {
      const { error } = await supabase.from("products").insert(row);
      return { error };
    },
    {
      slug: productSlug,
      brand_id: brand.id,
      name: input.productName.trim(),
      hero_url: input.heroUrl || null,
      images: [input.heroUrl, ...storyImages].filter(Boolean),
      tagline: input.productTagline.trim(),
      story: input.story,
      problem: input.productProblem.trim(),
      solution: input.productSolution.trim(),
      features: input.productFeatures.map((f) => f.trim()).filter(Boolean),
      price: input.price?.trim() || null,
      official_url: input.officialUrl?.trim() || null,
      category: input.category,
      status,
    } as never,
  );
  if ("error" in productRes) return { ok: false, error: productRes.error };

  return { ok: true, brandSlug: brand.slug, productSlug: productRes.slug };
}
