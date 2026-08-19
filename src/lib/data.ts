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
  Founder,
  MentorNote,
  Product,
  StoryBlock,
  SupportProgram,
} from "@/lib/types";
import {
  brands as mockBrands,
  events as mockEvents,
  founders as mockFounders,
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

interface FounderRow {
  slug: string;
  name: string;
  avatar_url: string | null;
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
  brand: { slug: string; founder: { slug: string } | null } | null;
}

async function fetchLive(): Promise<Catalog | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    // 공개 데이터 조회 전용 — 쿠키/세션 불필요 (RLS가 published만 허용)
    const supabase = createClient(url, key);

    const [brandsRes, productsRes] = await Promise.all([
      supabase
        .from("brands")
        .select(
          "slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,is_featured,founder:founders(slug,name,avatar_url,headline,bio,sns)",
        )
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select(
          "slug,name,hero_url,images,tagline,story,problem,solution,features,price,buy_url,official_url,category,view_count,is_featured,brand:brands!inner(slug,founder:founders(slug))",
        )
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (brandsRes.error || productsRes.error) return null;

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
          slug: f.slug,
          name: f.name,
          avatarUrl: f.avatar_url || placeholder(`founder-${f.slug}`, 240, 240),
          headline: f.headline,
          bio: f.bio ?? undefined,
          sns: f.sns ?? undefined,
          brandSlugs: [b.slug],
        });
      }
    }

    return { brands, products, founders: [...founderMap.values()] };
  } catch {
    return null;
  }
}

interface EventRow {
  slug: string;
  name: string;
  cover_url: string | null;
  host: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  is_online: boolean;
  fee: string | null;
  deadline: string | null;
  category: string;
  audience: string | null;
  apply_url: string;
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
  if (!url || !key) return mockEvents;

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("events")
      .select(
        "slug,name,cover_url,host,starts_at,ends_at,location,is_online,fee,deadline,category,audience,apply_url",
      )
      .eq("status", "published")
      .order("starts_at", { ascending: true });
    if (error) return mockEvents;

    const live: EventItem[] = ((data ?? []) as unknown as EventRow[]).map((e) => ({
      slug: e.slug,
      name: e.name,
      coverUrl: e.cover_url || placeholder(`event-${e.slug}`),
      host: e.host,
      startsAt: e.starts_at,
      endsAt: e.ends_at ?? undefined,
      location: e.location,
      isOnline: e.is_online,
      fee: e.fee ?? undefined,
      deadline: e.deadline ?? undefined,
      category: e.category as EventItem["category"],
      audience: e.audience ?? undefined,
      applyUrl: e.apply_url,
    }));
    return mergeBySlug(live, mockEvents);
  } catch {
    return mockEvents;
  }
});

/** 공개된 지원사업 — 실데이터 우선 + 목데이터 병합, 상태는 마감일 기준 자동 계산 */
export const getSupportPrograms = cache(async (): Promise<SupportProgram[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return mockSupport;

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("support_programs")
      .select("slug,name,agency,target,benefits,amount,open_at,close_at,region,field,apply_url")
      .eq("status", "published")
      .order("close_at", { ascending: true });
    if (error) return mockSupport;

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
    return mergeBySlug(live, mockSupport);
  } catch {
    return mockSupport;
  }
});

function mergeBySlug<T extends { slug: string }>(live: T[], mock: T[]): T[] {
  const liveSlugs = new Set(live.map((item) => item.slug));
  return [...live, ...mock.filter((item) => !liveSlugs.has(item.slug))];
}

/**
 * 파운더 단건 조회 — 아직 공개 브랜드가 없는 파운더도 프로필 페이지를 가질 수 있도록
 * 카탈로그(브랜드 조인 유도)와 별개로 직접 조회한다. 없으면 목데이터에서 찾는다.
 */
export const getFounder = cache(async (slug: string): Promise<Founder | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from("founders")
        .select("slug,name,avatar_url,headline,bio,sns")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        const f = data as unknown as FounderRow;
        const { brands } = await getCatalog();
        return {
          slug: f.slug,
          name: f.name,
          avatarUrl: f.avatar_url || placeholder(`founder-${f.slug}`, 240, 240),
          headline: f.headline,
          bio: f.bio ?? undefined,
          sns: f.sns ?? undefined,
          brandSlugs: brands
            .filter((b) => b.founderSlug === f.slug)
            .map((b) => b.slug),
        };
      }
    } catch {
      // 조회 실패 시 목데이터 폴백
    }
  }

  return mockFounders.find((f) => f.slug === slug) ?? null;
});

/** 실데이터 + 목데이터 병합 카탈로그. 렌더 1회당 캐시됨. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const live = await fetchLive();
  if (!live) {
    return { brands: mockBrands, products: mockProducts, founders: mockFounders };
  }
  return {
    brands: mergeBySlug(live.brands, mockBrands),
    products: mergeBySlug(live.products, mockProducts),
    founders: mergeBySlug(live.founders, mockFounders),
  };
});
