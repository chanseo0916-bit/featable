"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";
import type { StoryBlock } from "@/lib/types";
import { cleanSeoSlug, conciseSeoDescription, normalizeKeywords, seoTitle, storyText } from "@/lib/content-seo";

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
  coverUrl?: string; // 브랜드(기업) 커버 이미지
  heroUrl?: string;
  // STEP 8 — 공개 여부
  publish: boolean;
}

export type SubmissionDraftInput = Omit<PublishInput, "publish" | "productFeatures"> & {
  productFeatures: string;
};

export async function loadSubmissionDraft(draftKey: string): Promise<{ draft: SubmissionDraftInput; step: number; savedAt: number } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("submission_drafts").select("payload,current_step,updated_at").eq("user_id", user.id).eq("draft_key", draftKey).maybeSingle();
  if (error || !data || !data.payload || typeof data.payload !== "object") return null;
  return {
    draft: data.payload as SubmissionDraftInput,
    step: Number(data.current_step) || 0,
    savedAt: Date.parse(data.updated_at) || 0,
  };
}

export async function saveSubmissionDraft(draftKey: string, draft: SubmissionDraftInput, step: number): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("submission_drafts").upsert({ user_id: user.id, draft_key: draftKey, payload: draft, current_step: step, updated_at: new Date().toISOString() }, { onConflict: "user_id,draft_key" });
  return { ok: !error };
}

export async function deleteSubmissionDraft(draftKey: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("submission_drafts").delete().eq("user_id", user.id).eq("draft_key", draftKey);
}

export type PublishResult =
  | { ok: true; brandSlug: string; productSlug: string }
  | { ok: false; error: string };

export interface BrandRegistrationInput {
  slug?: string;
  name: string;
  tagline: string;
  category: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  ogImageUrl?: string;
}

export interface ProductRegistrationInput {
  slug?: string;
  brandId: string;
  name: string;
  tagline: string;
  category: string;
  problem?: string;
  solution?: string;
  features: string[];
  price?: string;
  officialUrl?: string;
  heroUrl?: string;
  story: StoryBlock[];
  publish: boolean;
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  ogImageUrl?: string;
}

export type BrandRegistrationResult =
  | { ok: true; brandId: string; brandSlug: string }
  | { ok: false; error: string };

export type ProductRegistrationResult =
  | { ok: true; productSlug: string }
  | { ok: false; error: string };

export type ProductDraftInput = Omit<ProductRegistrationInput, "features" | "publish"> & { features: string };

export async function loadProductDraft(draftKey: string): Promise<{ draft: ProductDraftInput; savedAt: number } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("submission_drafts").select("payload,updated_at").eq("user_id", user.id).eq("draft_key", `product:${draftKey}`.slice(0, 80)).maybeSingle();
  if (!data?.payload || typeof data.payload !== "object") return null;
  return { draft: data.payload as ProductDraftInput, savedAt: Date.parse(data.updated_at) || 0 };
}

export async function saveProductDraft(draftKey: string, draft: ProductDraftInput): Promise<{ ok: boolean; savedAt?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const savedAt = Date.now();
  const { error } = await supabase.from("submission_drafts").upsert({
    user_id: user.id,
    draft_key: `product:${draftKey}`.slice(0, 80),
    payload: draft,
    current_step: 1,
    updated_at: new Date(savedAt).toISOString(),
  }, { onConflict: "user_id,draft_key" });
  return error ? { ok: false } : { ok: true, savedAt };
}

export async function deleteProductDraft(draftKey: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("submission_drafts").delete().eq("user_id", user.id).eq("draft_key", `product:${draftKey}`.slice(0, 80));
}

export async function updateStandaloneBrand(brandId: string, input: BrandRegistrationInput): Promise<BrandRegistrationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.name.trim() || !input.tagline.trim()) return { ok: false, error: "기업명과 한 줄 소개를 입력해주세요." };

  const { data: targetBrand } = await supabase.from("brands").select("id,founder_id").eq("id", brandId).maybeSingle();
  if (!targetBrand) return { ok: false, error: "기업을 찾을 수 없습니다." };
  const [{ data: owner }, { data: membership }] = await Promise.all([
    supabase.from("founders").select("id").eq("id", targetBrand.founder_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("brand_members").select("member_role").eq("brand_id", brandId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!owner && membership?.member_role !== "editor") return { ok: false, error: "기업 수정 권한이 없습니다." };
  const { data: brand, error } = await supabase.from("brands").update({
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    category: input.category || "기타",
    description: input.description?.trim() || input.tagline.trim(),
    website: input.website?.trim() || null,
    logo_url: input.logoUrl || null,
    seo_title: seoTitle(input.seoTitle, `${input.name.trim()} 기업 소개`),
    seo_description: conciseSeoDescription(input.seoDescription || input.description || input.tagline),
    primary_keyword: input.primaryKeyword?.trim() || input.name.trim(),
    secondary_keywords: normalizeKeywords(input.secondaryKeywords),
    og_image_url: input.ogImageUrl || input.logoUrl || null,
    updated_at: new Date().toISOString(),
  }).eq("id", brandId).select("id,slug").maybeSingle();
  if (error || !brand) return { ok: false, error: "기업 정보 수정에 실패했습니다." };
  revalidatePath("/my");
  revalidatePath(`/brands/${brand.slug}`);
  return { ok: true, brandId: brand.id, brandSlug: brand.slug };
}

export async function updateStandaloneProduct(productId: string, input: ProductRegistrationInput): Promise<ProductRegistrationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.name.trim() || !input.tagline.trim()) return { ok: false, error: "프로덕트명과 한 줄 소개를 입력해주세요." };

  const { data: brand } = await supabase.from("brands").select("id,founder_id").eq("id", input.brandId).maybeSingle();
  if (!brand) return { ok: false, error: "소속 기업을 확인할 수 없습니다." };
  const [{ data: owner }, { data: membership }] = await Promise.all([
    supabase.from("founders").select("id").eq("id", brand.founder_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("brand_members").select("member_role").eq("brand_id", brand.id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!owner && membership?.member_role !== "editor") return { ok: false, error: "프로덕트 수정 권한이 없습니다." };

  const storyImages = input.story
    .filter((block): block is Extract<StoryBlock, { type: "image" }> => block.type === "image")
    .map((block) => block.src).filter(Boolean);
  const publishedAt = input.publish ? new Date().toISOString() : null;
  const { data: product, error } = await supabase.from("products").update({
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    category: input.category || "기타",
    problem: input.problem?.trim() || "",
    solution: input.solution?.trim() || "",
    features: input.features.map((item) => item.trim()).filter(Boolean),
    price: input.price?.trim() || null,
    official_url: input.officialUrl?.trim() || null,
    hero_url: input.heroUrl || null,
    images: [input.heroUrl, ...storyImages].filter(Boolean),
    story: input.story,
    status: input.publish ? "published" : "draft",
    seo_title: seoTitle(input.seoTitle, input.name.trim()),
    seo_description: conciseSeoDescription(input.seoDescription || `${input.tagline} ${input.solution || input.problem || storyText(input.story)}`),
    primary_keyword: input.primaryKeyword?.trim() || input.name.trim(),
    secondary_keywords: normalizeKeywords(input.secondaryKeywords),
    og_image_url: input.ogImageUrl || input.heroUrl || null,
    is_indexable: input.publish,
    published_at: publishedAt,
    updated_at: new Date().toISOString(),
  }).eq("id", productId).eq("brand_id", brand.id).select("slug").maybeSingle();
  if (error || !product) return { ok: false, error: "프로덕트 수정에 실패했습니다." };
  if (input.publish) await supabase.from("brands").update({ status: "published", is_indexable: true, published_at: new Date().toISOString() }).eq("id", brand.id);
  revalidatePath("/my");
  revalidatePath("/products");
  revalidatePath(`/products/${product.slug}`);
  return { ok: true, productSlug: product.slug };
}

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

/** 기업 정보만 먼저 등록한다. 프로덕트와 Founder 프로필은 이 과정에 묶지 않는다. */
export async function createStandaloneBrand(input: BrandRegistrationInput): Promise<BrandRegistrationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.name.trim() || !input.tagline.trim()) return { ok: false, error: "기업명과 한 줄 소개를 입력해주세요." };

  let { data: founder } = await supabase.from("founders").select("id").eq("user_id", user.id).maybeSingle();
  if (!founder) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const founderName = profile?.full_name?.trim() || user.user_metadata?.full_name || user.user_metadata?.name || "Founder";
    const { data: created, error } = await supabase.from("founders").insert({
      user_id: user.id,
      slug: `${slugify(founderName) || "founder"}-${randomSuffix()}`,
      name: founderName,
      headline: "새로운 브랜드를 만들고 있습니다.",
    }).select("id").single();
    if (error || !created) return { ok: false, error: "기업을 등록할 계정 정보를 만들지 못했습니다." };
    founder = created;
  }

  const slug = cleanSeoSlug(input.slug || "") || slugify(input.name) || `brand-${randomSuffix()}`;
  const result = await insertWithSlugRetry(
    async (row) => {
      const { error } = await supabase.from("brands").insert(row);
      return { error };
    },
    {
      slug,
      founder_id: founder.id,
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      category: input.category || "기타",
      description: input.description?.trim() || input.tagline.trim(),
      website: input.website?.trim() || null,
      logo_url: input.logoUrl || null,
      status: "draft",
      seo_title: seoTitle(input.seoTitle, `${input.name.trim()} 기업 소개`),
      seo_description: conciseSeoDescription(input.seoDescription || input.description || input.tagline),
      primary_keyword: input.primaryKeyword?.trim() || input.name.trim(),
      secondary_keywords: normalizeKeywords(input.secondaryKeywords),
      og_image_url: input.ogImageUrl || input.logoUrl || null,
      is_indexable: false,
    } as never,
  );
  if ("error" in result) return { ok: false, error: result.error };
  const { data: brand } = await supabase.from("brands").select("id,slug").eq("slug", result.slug).single();
  if (!brand) return { ok: false, error: "기업 저장 확인에 실패했습니다." };
  revalidatePath("/my");
  revalidatePath("/brands");
  return { ok: true, brandId: brand.id, brandSlug: brand.slug };
}

/** 기존 기업 아래에 프로덕트와 그 상세페이지를 등록한다. */
export async function createStandaloneProduct(input: ProductRegistrationInput): Promise<ProductRegistrationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.brandId || !input.name.trim() || !input.tagline.trim()) return { ok: false, error: "소속 기업, 프로덕트명과 한 줄 소개를 입력해주세요." };

  const { data: founder } = await supabase.from("founders").select("id").eq("user_id", user.id).maybeSingle();
  if (!founder) return { ok: false, error: "먼저 기업 정보를 등록해주세요." };
  const { data: brand } = await supabase.from("brands").select("id").eq("id", input.brandId).eq("founder_id", founder.id).maybeSingle();
  if (!brand) return { ok: false, error: "프로덕트를 등록할 기업을 찾을 수 없습니다." };

  const storyImages = input.story
    .filter((block): block is Extract<StoryBlock, { type: "image" }> => block.type === "image")
    .map((block) => block.src).filter(Boolean);
  const result = await insertWithSlugRetry(
    async (row) => {
      const { error } = await supabase.from("products").insert(row);
      return { error };
    },
    {
      slug: cleanSeoSlug(input.slug || "") || slugify(input.name) || `product-${randomSuffix()}`,
      brand_id: brand.id,
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      category: input.category || "기타",
      problem: input.problem?.trim() || "",
      solution: input.solution?.trim() || "",
      features: input.features.map((item) => item.trim()).filter(Boolean),
      price: input.price?.trim() || null,
      official_url: input.officialUrl?.trim() || null,
      hero_url: input.heroUrl || null,
      images: [input.heroUrl, ...storyImages].filter(Boolean),
      story: input.story,
      status: input.publish ? "published" : "draft",
      seo_title: seoTitle(input.seoTitle, input.name.trim()),
      seo_description: conciseSeoDescription(input.seoDescription || `${input.tagline} ${input.solution || input.problem || storyText(input.story)}`),
      primary_keyword: input.primaryKeyword?.trim() || input.name.trim(),
      secondary_keywords: normalizeKeywords(input.secondaryKeywords),
      og_image_url: input.ogImageUrl || input.heroUrl || null,
      is_indexable: input.publish,
      published_at: input.publish ? new Date().toISOString() : null,
    } as never,
  );
  if ("error" in result) return { ok: false, error: result.error };
  if (input.publish) await supabase.from("brands").update({ status: "published", is_indexable: true, published_at: new Date().toISOString() }).eq("id", brand.id);
  revalidatePath("/my");
  revalidatePath("/brands");
  revalidatePath("/products");
  return { ok: true, productSlug: result.slug };
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
    const { error } = await supabase
      .from("founders")
      .update({
        name: input.founderName.trim(),
        headline: input.founderHeadline.trim(),
        bio: input.founderBio?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", founderId);
    if (error) return { ok: false, error: "창업가 프로필 저장에 실패했습니다." };
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
      cover_url: input.coverUrl || null,
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
  if ("error" in productRes) {
    // 제품 생성 실패 시 이번 요청에서 만든 브랜드를 제거해 고아 데이터가 남지 않게 한다.
    await supabase.from("brands").delete().eq("id", brand.id);
    return { ok: false, error: productRes.error };
  }

  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath("/products");
  revalidatePath("/my");
  return { ok: true, brandSlug: brand.slug, productSlug: productRes.slug };
}

/** 기존 브랜드+프로덕트 수정. slug는 URL 안정성을 위해 변경하지 않는다. */
export async function updateBrand(
  input: PublishInput,
  ids: { brandId: string; productId: string },
): Promise<PublishResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input.brandName.trim() || !input.founderName.trim() || !input.productName.trim()) {
    return { ok: false, error: "브랜드명, 창업가 이름, 제품명은 필수입니다." };
  }

  const status = input.publish ? "published" : "draft";

  // Founder 정보 갱신 (본인 것만 — RLS)
  await supabase
    .from("founders")
    .update({
      name: input.founderName.trim(),
      headline: input.founderHeadline.trim(),
      bio: input.founderBio?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  // Brand 갱신 — RLS(owns_founder)가 소유권을 보장하고, 남의 행이면 0건 갱신된다
  const { data: brandRow, error: brandErr } = await supabase
    .from("brands")
    .update({
      name: input.brandName.trim(),
      logo_url: input.logoUrl || null,
      cover_url: input.coverUrl || null,
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      problem: input.problem?.trim() || null,
      audience: input.audience?.trim() || null,
      category: input.category,
      website: input.website?.trim() || null,
      sns: input.instagram ? { instagram: input.instagram.trim() } : {},
      founded_at: input.foundedAt?.trim() || null,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ids.brandId)
    .select("slug")
    .maybeSingle();
  if (brandErr || !brandRow) {
    return { ok: false, error: "브랜드 수정에 실패했습니다. 권한을 확인해주세요." };
  }

  const storyImages = input.story
    .filter((block): block is Extract<StoryBlock, { type: "image" }> => block.type === "image")
    .map((block) => block.src)
    .filter(Boolean);

  const { data: productRow, error: productErr } = await supabase
    .from("products")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", ids.productId)
    .eq("brand_id", ids.brandId)
    .select("slug")
    .maybeSingle();
  if (productErr || !productRow) {
    return { ok: false, error: "프로덕트 수정에 실패했습니다." };
  }

  revalidatePath("/");
  revalidatePath("/brands");
  revalidatePath("/products");
  revalidatePath(`/brands/${brandRow.slug}`);
  revalidatePath(`/products/${productRow.slug}`);
  revalidatePath("/my");
  return { ok: true, brandSlug: brandRow.slug, productSlug: productRow.slug };
}

/** 브랜드 삭제 — 소속 프로덕트는 FK cascade로 함께 삭제된다 */
export async function deleteBrand(brandId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase.from("brands").delete().eq("id", brandId);
  if (error) return { error: "삭제에 실패했습니다." };
  return {};
}
