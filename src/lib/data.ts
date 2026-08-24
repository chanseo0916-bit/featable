/**
 * 공개 카탈로그 데이터 레이어 (Claude 관리).
 * Supabase의 published 브랜드·프로덕트·파운더를 공유 타입으로 매핑하고,
 * 데모용 목데이터와 병합해 반환한다 (실데이터 우선, slug 중복 시 실데이터가 이김).
 * Supabase 환경변수가 없거나 조회에 실패하면 목데이터만 반환하므로
 * UI 작업(Codex)은 DB 없이도 그대로 동작한다.
 */
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type {
  Brand,
  Category,
  EventItem,
  Feature,
  Founder,
  Job,
  MentorNote,
  Partner,
  Product,
  Community,
  StoryBlock,
  SupportProgram,
} from "@/lib/types";
import {
  brands as mockBrands,
  communities as mockCommunities,
  events as mockEvents,
  founders as mockFounders,
  features as mockFeatures,
  jobs as mockJobs,
  partners as mockPartners,
  products as mockProducts,
  supportPrograms as mockSupport,
} from "@/lib/mock";

export interface Catalog {
  brands: Brand[];
  products: Product[];
  founders: Founder[];
}

const placeholder = (seed: string, w = 1200, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

type PublicDataError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * 공개 화면은 목데이터로 계속 응답하되, 운영 환경의 Supabase/RLS/스키마 문제는
 * 배포 런타임 로그에서 즉시 식별할 수 있도록 안전한 오류 요약만 남긴다.
 */
function reportPublicDataFallback(resource: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") return;

  const source = error && typeof error === "object" ? error as PublicDataError : undefined;
  console.error("[featable:data-fallback]", {
    resource,
    code: source?.code,
    message: source?.message ?? (error instanceof Error ? error.message : String(error)),
    details: source?.details,
    hint: source?.hint,
  });
}

function hasPublicSupabaseConfig(url: string | undefined, key: string | undefined, resource: string) {
  if (url && key) return true;
  reportPublicDataFallback(resource, "Supabase public environment variables are missing");
  return false;
}

/** Demo records are for local UI work only; production must never expose placeholder CTAs. */
function developmentFallback<T>(records: T[]): T[] {
  return process.env.NODE_ENV === "production" ? [] : records;
}

interface FounderRow {
  founder_number: number | null;
  slug: string;
  name: string;
  avatar_url: string | null;
  role_title?: string | null;
  headline: string;
  bio: string | null;
  sns?: Founder["sns"] | null;
}

interface BrandRow {
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  tagline: string;
  description: string;
  problem: string | null;
  audience: string | null;
  category: string;
  website: string | null;
  sns: { instagram?: string; x?: string; youtube?: string } | null;
  founded_at: string | null;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  og_image_url: string | null;
  is_indexable: boolean;
  published_at: string | null;
  updated_at: string;
  founder: FounderRow | null;
}

interface ProductRow {
  slug: string;
  name: string;
  hero_url: string | null;
  images: string[] | null;
  tagline: string;
  story: StoryBlock[] | null;
  problem: string;
  solution: string;
  features: string[] | null;
  price: string | null;
  buy_url: string | null;
  official_url: string | null;
  category: string;
  view_count: number | null;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  og_image_url: string | null;
  is_indexable: boolean;
  published_at: string | null;
  updated_at: string;
  brand: { slug: string; founder: { slug: string } | null } | null;
}

async function fetchLive(): Promise<Catalog | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "catalog")) return null;

  try {
    // 공개 데이터 조회 전용 — 쿠키/세션 불필요 (RLS가 published만 허용)
    const supabase = createClient(url!, key!);

    const loadBrands = (includeRole: boolean) => supabase
        .from("brands")
        .select(
          includeRole
            ? "slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,is_featured,seo_title,seo_description,primary_keyword,secondary_keywords,og_image_url,is_indexable,published_at,updated_at,founder:founders(founder_number,slug,name,avatar_url,role_title,headline,bio,sns)"
            : "slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,is_featured,seo_title,seo_description,primary_keyword,secondary_keywords,og_image_url,is_indexable,published_at,updated_at,founder:founders(founder_number,slug,name,avatar_url,headline,bio,sns)",
        )
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

    const [initialBrandsRes, productsRes] = await Promise.all([
      loadBrands(true),
      supabase
        .from("products")
        .select(
          "slug,name,hero_url,images,tagline,story,problem,solution,features,price,buy_url,official_url,category,view_count,is_featured,seo_title,seo_description,primary_keyword,secondary_keywords,og_image_url,is_indexable,published_at,updated_at,brand:brands!inner(slug,founder:founders(slug))",
        )
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    let brandsRes = initialBrandsRes;
    // 새 역할 마이그레이션 적용 전에도 기존 공개 카탈로그는 정상 노출한다.
    if (brandsRes.error?.code === "42703" && brandsRes.error.message.includes("role_title")) {
      brandsRes = await loadBrands(false);
    }

    if (brandsRes.error || productsRes.error) {
      reportPublicDataFallback("catalog", brandsRes.error ?? productsRes.error);
      return null;
    }

    const brandRows = (brandsRes.data ?? []) as unknown as BrandRow[];
    const productRows = (productsRes.data ?? []) as unknown as ProductRow[];

    const products: Product[] = productRows.map((p) => ({
      slug: p.slug,
      name: p.name,
      heroUrl: p.hero_url || placeholder(`product-${p.slug}`, 1200, 900),
      images: p.images ?? [],
      brandSlug: p.brand?.slug ?? "",
      founderSlug: p.brand?.founder?.slug ?? "",
      tagline: p.tagline,
      story: p.story ?? [],
      problem: p.problem,
      solution: p.solution,
      features: p.features ?? [],
      price: p.price ?? undefined,
      buyUrl: p.buy_url ?? undefined,
      officialUrl: p.official_url ?? undefined,
      category: p.category as Category,
      mentorNote: undefined as MentorNote | undefined,
      viewCount: p.view_count ?? 0,
      isFeatured: p.is_featured,
      seoTitle: p.seo_title ?? undefined,
      seoDescription: p.seo_description ?? undefined,
      primaryKeyword: p.primary_keyword ?? undefined,
      secondaryKeywords: p.secondary_keywords ?? [],
      ogImageUrl: p.og_image_url ?? undefined,
      isIndexable: p.is_indexable,
      publishedAt: p.published_at ?? undefined,
      updatedAt: p.updated_at,
    }));

    const brands: Brand[] = brandRows.map((b) => ({
      slug: b.slug,
      name: b.name,
      logoUrl: b.logo_url || placeholder(`logo-${b.slug}`, 160, 160),
      coverUrl: b.cover_url ?? undefined,
      tagline: b.tagline,
      description: b.description,
      problem: b.problem ?? undefined,
      audience: b.audience ?? undefined,
      category: b.category as Category,
      founderSlug: b.founder?.slug ?? "",
      website: b.website ?? undefined,
      sns: b.sns ?? undefined,
      foundedAt: b.founded_at ?? undefined,
      productSlugs: products
        .filter((p) => p.brandSlug === b.slug)
        .map((p) => p.slug),
      featureSlugs: [],
      isFeatured: b.is_featured,
      seoTitle: b.seo_title ?? undefined,
      seoDescription: b.seo_description ?? undefined,
      primaryKeyword: b.primary_keyword ?? undefined,
      secondaryKeywords: b.secondary_keywords ?? [],
      ogImageUrl: b.og_image_url ?? undefined,
      isIndexable: b.is_indexable,
      publishedAt: b.published_at ?? undefined,
      updatedAt: b.updated_at,
    }));

    // Founder는 브랜드 조인에서 유도 (slug 기준 중복 제거)
    const founderMap = new Map<string, Founder>();
    for (const b of brandRows) {
      if (!b.founder) continue;
      const f = b.founder;
      const existing = founderMap.get(f.slug);
      if (existing) {
        existing.brandSlugs.push(b.slug);
      } else {
        founderMap.set(f.slug, {
          founderNumber: f.founder_number ?? undefined,
          slug: f.slug,
          name: f.name,
          avatarUrl: f.avatar_url || placeholder(`founder-${f.slug}`, 240, 240),
          role: f.role_title || undefined,
          headline: f.headline,
          bio: f.bio ?? undefined,
          sns: f.sns ?? undefined,
          brandSlugs: [b.slug],
        });
      }
    }

    // 브랜드보다 인터뷰를 먼저 올린 파운더도 작성자로 잡혀야 한다.
    // (브랜드 조인만으로는 브랜드 없는 파운더가 통째로 빠진다)
    const { data: soloFounderRows } = await supabase
      .from("founders")
      .select("founder_number,slug,name,avatar_url,role_title,headline,bio,sns");
    for (const f of (soloFounderRows ?? []) as unknown as FounderRow[]) {
      if (founderMap.has(f.slug)) continue;
      founderMap.set(f.slug, {
        founderNumber: f.founder_number ?? undefined,
        slug: f.slug,
        name: f.name,
        avatarUrl: f.avatar_url || placeholder(`founder-${f.slug}`, 240, 240),
        role: f.role_title || undefined,
        headline: f.headline,
        bio: f.bio ?? undefined,
        sns: f.sns ?? undefined,
        brandSlugs: [],
      });
    }

    return { brands, products, founders: [...founderMap.values()] };
  } catch (error) {
    reportPublicDataFallback("catalog", error);
    return null;
  }
}

interface EventRow {
  id: string;
  slug: string;
  name: string;
  cover_url: string | null;
  description: string | null;
  gallery_urls: string[] | null;
  program: { time?: string; title: string; speaker?: string }[] | null;
  registration_fields: EventItem["registrationFields"] | null;
  host: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  is_online: boolean;
  fee: string | null;
  is_paid: boolean;
  payment_account: string | null;
  payment_notice: string | null;
  deadline: string | null;
  category: string;
  audience: string | null;
  apply_url: string | null;
  view_count: number | null;
  is_featured: boolean;
  registration_mode: "external" | "internal" | "closed";
  approval_mode: "instant" | "manual";
  capacity: number | null;
  waitlist_enabled: boolean;
  submitted_by: string | null;
}

interface SupportRow {
  slug: string;
  name: string;
  agency: string;
  target: string;
  benefits: string;
  amount: string | null;
  open_at: string | null;
  close_at: string;
  region: string;
  field: string | null;
  apply_url: string;
}

interface FeatureRow {
  slug: string;
  title: string;
  cover_url: string | null;
  kind: Feature["kind"];
  excerpt: string;
  hook_intro: string | null;
  hook_label: string | null;
  body: StoryBlock[] | null;
  published_at: string | null;
  view_count: number | null;
  seo_title: string | null;
  seo_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  og_image_url: string | null;
  is_indexable: boolean;
  updated_at: string;
  brand: { slug: string } | null;
  founder: { slug: string } | null;
}

interface CommunityRow {
  slug: string;
  name: string;
  logo_url: string | null;
  intro: string;
  field: string;
  website: string | null;
  sns: Community["sns"] | null;
  community_founders: Array<{ founder: { slug: string } | null }> | null;
  community_brands: Array<{ brand: { slug: string } | null }> | null;
  events: Array<{ slug: string }> | null;
}

interface JobRow {
  slug: string;
  title: string;
  role: string;
  type: Job["type"];
  location: string;
  apply_url: string | null;
  description: string | null;
  requirements: string[] | null;
  deadline: string | null;
  created_at: string;
  brand: { slug: string; name: string; logo_url: string | null } | null;
  community: { id: string; name: string; logo_url: string | null } | null;
  partner: { id: string; name: string; logo_url: string | null } | null;
}

function supportStatus(openAt: string | null, closeAt: string): SupportProgram["status"] {
  const now = Date.now();
  if (openAt && new Date(openAt).getTime() > now) return "예정";
  const close = new Date(`${closeAt}T23:59:59+09:00`).getTime();
  if (close < now) return "마감";
  return close - now <= 7 * 86_400_000 ? "마감임박" : "모집중";
}

/** 공개된 행사 — 실데이터 우선 + 목데이터 병합 */
export const getEvents = cache(async (): Promise<EventItem[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "events")) return developmentFallback(mockEvents);

  try {
    const supabase = createClient(url!, key!);
    const baseEventColumns = "id,slug,name,cover_url,view_count,host,starts_at,ends_at,location,is_online,fee,is_paid,payment_account,payment_notice,deadline,category,audience,apply_url,is_featured,registration_mode,approval_mode,capacity,waitlist_enabled,submitted_by";
    let { data, error }: { data: unknown; error: { message?: string } | null } = await supabase
      .from("events")
      .select(`id,slug,name,cover_url,description,gallery_urls,program,registration_fields,${baseEventColumns.replace("id,slug,name,cover_url,", "")}`)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("starts_at", { ascending: true });
    if (error && /description|gallery_urls|program|registration_fields|is_paid|payment_account|payment_notice|view_count/.test(error.message ?? "")) {
      // migration-31(행사 상세 컬럼) 적용 전 DB 호환 폴백
      ({ data, error } = await supabase
        .from("events")
        .select(baseEventColumns.replace("view_count,", ""))
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("starts_at", { ascending: true }));
    }
    if (error) {
      reportPublicDataFallback("events", error);
      return developmentFallback(mockEvents);
    }

    const live: EventItem[] = ((data ?? []) as unknown as EventRow[]).map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      coverUrl: e.cover_url || placeholder(`event-${e.slug}`),
      description: e.description || undefined,
      galleryUrls: e.gallery_urls ?? [],
      program: e.program ?? [],
      registrationFields: e.registration_fields ?? [],
      host: e.host,
      startsAt: e.starts_at,
      endsAt: e.ends_at ?? undefined,
      location: e.location,
      isOnline: e.is_online,
      fee: e.fee ?? undefined,
      isPaid: e.is_paid,
      paymentAccount: e.payment_account ?? undefined,
      paymentNotice: e.payment_notice ?? undefined,
      deadline: e.deadline ?? undefined,
      category: e.category as EventItem["category"],
      audience: e.audience ?? undefined,
      applyUrl: e.apply_url ?? undefined,
      isFeatured: e.is_featured,
      registrationMode: e.registration_mode,
      approvalMode: e.approval_mode,
      capacity: e.capacity ?? undefined,
      waitlistEnabled: e.waitlist_enabled,
      registrationClosed: (e.deadline ? new Date(e.deadline).getTime() < Date.now() : false) || new Date(e.starts_at).getTime() <= Date.now(),
      submittedBy: e.submitted_by ?? undefined,
      viewCount: e.view_count ?? 0,
    }));
    return live; // 실데이터만 노출 (데모 콘텐츠 제거)
  } catch (error) {
    reportPublicDataFallback("events", error);
    return developmentFallback(mockEvents);
  }
});

/** 공개된 지원사업 — 실데이터 우선 + 목데이터 병합, 상태는 마감일 기준 자동 계산 */
export const getSupportPrograms = cache(async (): Promise<SupportProgram[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "support-programs")) return developmentFallback(mockSupport);

  try {
    const supabase = createClient(url!, key!);
    const { data, error } = await supabase
      .from("support_programs")
      .select("slug,name,agency,target,benefits,amount,open_at,close_at,region,field,apply_url")
      .eq("status", "published")
      .order("close_at", { ascending: true });
    if (error) {
      reportPublicDataFallback("support-programs", error);
      return developmentFallback(mockSupport);
    }

    const live: SupportProgram[] = ((data ?? []) as unknown as SupportRow[]).map((s) => ({
      slug: s.slug,
      name: s.name,
      agency: s.agency,
      target: s.target,
      benefits: s.benefits,
      amount: s.amount ?? undefined,
      openAt: s.open_at ?? undefined,
      closeAt: s.close_at,
      region: s.region,
      field: s.field ?? undefined,
      applyUrl: s.apply_url,
      status: supportStatus(s.open_at, s.close_at),
    }));
    return live; // 실데이터만 노출 (데모 콘텐츠 제거)
  } catch (error) {
    reportPublicDataFallback("support-programs", error);
    return developmentFallback(mockSupport);
  }
});

/** 공개 스토리 — Supabase 등록 콘텐츠를 목데이터보다 우선한다. */
export const getFeatures = cache(async (): Promise<Feature[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "features")) return mockFeatures;

  try {
    const supabase = createClient(url!, key!);
    const baseColumns = "slug,title,cover_url,kind,excerpt,body,published_at,view_count,seo_title,seo_description,primary_keyword,secondary_keywords,og_image_url,is_indexable,updated_at,brand:brands(slug),founder:founders(slug)";
    let { data, error }: { data: unknown; error: { message?: string } | null } = await supabase
      .from("features")
      .select(`${baseColumns},hook_intro,hook_label`)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error && /hook_intro|hook_label/.test(error.message ?? "")) {
      // migration-30(hook_intro) 적용 전 DB 호환 폴백
      ({ data, error } = await supabase
        .from("features")
        .select(baseColumns)
        .eq("status", "published")
        .order("published_at", { ascending: false }));
    }
    if (error) {
      reportPublicDataFallback("features", error);
      return mockFeatures;
    }

    const live: Feature[] = ((data ?? []) as unknown as FeatureRow[]).map((feature) => ({
      slug: feature.slug,
      title: feature.title,
      coverUrl: feature.cover_url || placeholder(`feature-${feature.slug}`),
      kind: feature.kind,
      excerpt: feature.excerpt,
      hookIntro: feature.hook_intro ?? undefined,
      hookLabel: feature.hook_label ?? undefined,
      body: feature.body ?? [],
      brandSlug: feature.brand?.slug,
      founderSlug: feature.founder?.slug,
      publishedAt: feature.published_at ?? new Date(0).toISOString(),
      viewCount: feature.view_count ?? 0,
      seoTitle: feature.seo_title ?? undefined,
      seoDescription: feature.seo_description ?? undefined,
      primaryKeyword: feature.primary_keyword ?? undefined,
      secondaryKeywords: feature.secondary_keywords ?? [],
      ogImageUrl: feature.og_image_url ?? undefined,
      isIndexable: feature.is_indexable,
      updatedAt: feature.updated_at,
    }));
    return mergeBySlug(live, mockFeatures);
  } catch (error) {
    reportPublicDataFallback("features", error);
    return mockFeatures;
  }
});

export const getFeature = cache(async (slug: string): Promise<Feature | null> =>
  (await getFeatures()).find((feature) => feature.slug === slug) ?? null,
);

/** 공개 커뮤니티 — 연결된 Founder·브랜드·행사 slug까지 함께 반환한다. */
export const getCommunities = cache(async (): Promise<Community[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "communities")) return developmentFallback(mockCommunities);

  try {
    const supabase = createClient(url!, key!);
    const { data, error } = await supabase
      .from("communities")
      .select("slug,name,logo_url,intro,field,website,sns,community_founders(founder:founders(slug)),community_brands(brand:brands(slug)),events(slug)")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) {
      reportPublicDataFallback("communities", error);
      return developmentFallback(mockCommunities);
    }

    const live: Community[] = ((data ?? []) as unknown as CommunityRow[]).map((community) => ({
      slug: community.slug,
      name: community.name,
      logoUrl: community.logo_url || placeholder(`community-${community.slug}`, 240, 240),
      intro: community.intro,
      field: community.field,
      website: community.website ?? undefined,
      sns: community.sns ?? undefined,
      founderSlugs: (community.community_founders ?? []).flatMap((item) => item.founder?.slug ? [item.founder.slug] : []),
      brandSlugs: (community.community_brands ?? []).flatMap((item) => item.brand?.slug ? [item.brand.slug] : []),
      eventSlugs: (community.events ?? []).map((event) => event.slug),
      featureSlugs: [],
    }));
    return live; // 실데이터만 노출 (데모 콘텐츠 제거)
  } catch (error) {
    reportPublicDataFallback("communities", error);
    return developmentFallback(mockCommunities);
  }
});

export const getCommunity = cache(async (slug: string): Promise<Community | null> =>
  (await getCommunities()).find((community) => community.slug === slug) ?? null,
);

/** 공개 채용 — 브랜드 연결을 포함해 실데이터를 목데이터보다 우선한다. */
export const getJobs = cache(async (): Promise<Job[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "jobs")) return developmentFallback(mockJobs);

  try {
    const supabase = createClient(url!, key!);
    let { data, error }: { data: unknown; error: { message?: string } | null } = await supabase
      .from("jobs")
      .select("slug,title,role,type,location,apply_url,description,requirements,deadline,created_at,brand:brands(slug,name,logo_url),community:communities(id,name,logo_url),partner:partners(id,name,logo_url)")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error && /description|requirements|deadline|community|partner|relationship/i.test(error.message ?? "")) {
      // migration-44 적용 전에도 기존 브랜드 채용 목록은 계속 노출한다.
      ({ data, error } = await supabase
        .from("jobs")
        .select("slug,title,role,type,location,apply_url,created_at,brand:brands(slug,name,logo_url)")
        .eq("status", "published")
        .order("created_at", { ascending: false }));
    }
    if (error) {
      reportPublicDataFallback("jobs", error);
      return developmentFallback(mockJobs);
    }

    const live: Job[] = ((data ?? []) as unknown as JobRow[])
      .filter((job) => Boolean(job.brand?.slug || job.community?.id || job.partner?.id))
      .map((job) => ({
        slug: job.slug,
        title: job.title,
        brandSlug: job.brand?.slug,
        communityId: job.community?.id,
        partnerId: job.partner?.id,
        organizationName: job.partner?.name ?? job.community?.name ?? job.brand?.name,
        organizationLogoUrl: job.partner?.logo_url ?? job.community?.logo_url ?? job.brand?.logo_url ?? undefined,
        role: job.role,
        type: job.type,
        location: job.location,
        applyUrl: job.apply_url ?? undefined,
        description: job.description ?? undefined,
        requirements: job.requirements ?? [],
        deadline: job.deadline ?? undefined,
        postedAt: job.created_at,
      }));
    return live; // 실데이터만 노출 (데모 콘텐츠 제거)
  } catch (error) {
    reportPublicDataFallback("jobs", error);
    return developmentFallback(mockJobs);
  }
});

export const getJob = cache(async (slug: string): Promise<Job | null> =>
  (await getJobs()).find((job) => job.slug === slug) ?? null,
);

function mergeBySlug<T extends { slug: string }>(live: T[], mock: T[]): T[] {
  const liveSlugs = new Set(live.map((item) => item.slug));
  return [...live, ...mock.filter((item) => !liveSlugs.has(item.slug))];
}

interface PartnerRow {
  name: string;
  logo_url: string;
  href: string;
  intro: string | null;
  description: string | null;
  field: string | null;
  is_featured: boolean | null;
}

/** 공개된 파트너 — 실데이터 우선 + 목데이터 병합 (파트너는 slug가 없어 이름 기준) */
export const getPartners = cache(async (): Promise<Partner[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "partners")) return developmentFallback(mockPartners);

  try {
    const supabase = createClient(url!, key!);
    const { data, error } = await supabase
      .from("partners")
      .select("name,logo_url,href,intro,description,field,is_featured")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      reportPublicDataFallback("partners", error);
      return developmentFallback(mockPartners);
    }

    const live: Partner[] = ((data ?? []) as unknown as PartnerRow[]).map((p) => ({
      name: p.name,
      logoUrl: p.logo_url || placeholder(`partner-${p.name}`, 160, 160),
      href: p.href,
      intro: p.intro || undefined,
      description: p.description ?? undefined,
      field: p.field ?? undefined,
      featured: p.is_featured ?? false,
    }));
    return live; // 실데이터만 노출 (데모 파트너 제거)
  } catch (error) {
    reportPublicDataFallback("partners", error);
    return developmentFallback(mockPartners);
  }
});

/**
 * 파운더 단건 조회 — 아직 공개 브랜드가 없는 파운더도 프로필 페이지를 가질 수 있도록
 * 카탈로그(브랜드 조인 유도)와 별개로 직접 조회한다. 없으면 목데이터에서 찾는다.
 */
export const getFounder = cache(async (slug: string): Promise<Founder | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasPublicSupabaseConfig(url, key, "founder")) {
    try {
      const supabase = createClient(url!, key!);
      let founderRes = await supabase
        .from("founders")
        .select("founder_number,slug,name,avatar_url,role_title,headline,bio,sns")
        .eq("slug", slug)
        .maybeSingle();
      if (founderRes.error?.code === "42703" && founderRes.error.message.includes("role_title")) {
        founderRes = await supabase
          .from("founders")
          .select("founder_number,slug,name,avatar_url,headline,bio,sns")
          .eq("slug", slug)
          .maybeSingle();
      }
      const { data, error } = founderRes;
      if (error) {
        reportPublicDataFallback("founder", error);
      }
      if (data) {
        const f = data as unknown as FounderRow;
        const { brands } = await getCatalog();
        return {
          founderNumber: f.founder_number ?? undefined,
          slug: f.slug,
          name: f.name,
          avatarUrl: f.avatar_url || placeholder(`founder-${f.slug}`, 240, 240),
          role: f.role_title || undefined,
          headline: f.headline,
          bio: f.bio ?? undefined,
          sns: f.sns ?? undefined,
          brandSlugs: brands
            .filter((b) => b.founderSlug === f.slug)
            .map((b) => b.slug),
        };
      }
    } catch (error) {
      reportPublicDataFallback("founder", error);
      return process.env.NODE_ENV === "production" ? null : mockFounders.find((f) => f.slug === slug) ?? null;
    }
    // 라이브 조회가 정상 수행됐고 결과가 없으면 데모 폴백 없이 404
    return null;
  }

  return process.env.NODE_ENV === "production" ? null : mockFounders.find((f) => f.slug === slug) ?? null;
});

/** 행사 등록 계정에 연결된 공개 파운더 프로필. 비공개 profiles 정보는 조회하지 않는다. */
export const getFounderByUserId = cache(async (userId: string): Promise<Founder | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasPublicSupabaseConfig(url, key, "event-organizer")) return null;

  try {
    const supabase = createClient(url!, key!);
    let founderRes = await supabase
      .from("founders")
      .select("founder_number,slug,name,avatar_url,role_title,headline,bio,sns")
      .eq("user_id", userId)
      .maybeSingle();
    if (founderRes.error?.code === "42703" && founderRes.error.message.includes("role_title")) {
      founderRes = await supabase
        .from("founders")
        .select("founder_number,slug,name,avatar_url,headline,bio,sns")
        .eq("user_id", userId)
        .maybeSingle();
    }

    const { data, error } = founderRes;
    if (error) {
      reportPublicDataFallback("event-organizer", error);
      return null;
    }
    if (!data) return null;

    const f = data as unknown as FounderRow;
    return {
      founderNumber: f.founder_number ?? undefined,
      slug: f.slug,
      name: f.name,
      avatarUrl: f.avatar_url || placeholder(`founder-${f.slug}`, 240, 240),
      role: f.role_title || undefined,
      headline: f.headline,
      bio: f.bio ?? undefined,
      sns: f.sns ?? undefined,
      brandSlugs: [],
    };
  } catch (error) {
    reportPublicDataFallback("event-organizer", error);
    return null;
  }
});

/** 실데이터 + 목데이터 병합 카탈로그. 렌더 1회당 캐시됨. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const live = await fetchLive();
  if (!live) {
    // DB 미설정/장애 시에만 데모 폴백 (로컬 UI 개발용)
    return process.env.NODE_ENV === "production"
      ? { brands: [], products: [], founders: [] }
      : { brands: mockBrands, products: mockProducts, founders: mockFounders };
  }
  // 실데이터만 노출 — 데모 브랜드·프로덕트·파운더는 공개 사이트에서 제거 (스토리는 getFeatures에서 SEO용으로 유지)
  return live;
});

/**
 * 항목별 좋아요 수. saved_items 는 본인 행만 읽히므로 집계 뷰(migration-36)를 쓴다.
 * 뷰가 아직 없으면 0으로 떨어져 화면은 그대로 동작한다.
 */
export const getLikeCount = cache(async (itemType: string, itemSlug: string): Promise<number> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return 0;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("item_like_counts")
      .select("like_count")
      .eq("item_type", itemType)
      .eq("item_slug", itemSlug)
      .maybeSingle();
    if (error) return 0;
    return (data as { like_count: number } | null)?.like_count ?? 0;
  } catch {
    return 0;
  }
});
