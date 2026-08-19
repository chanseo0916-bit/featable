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
  Founder,
  MentorNote,
  Product,
  StoryBlock,
} from "@/lib/types";
import {
  brands as mockBrands,
  founders as mockFounders,
  products as mockProducts,
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
          "slug,name,logo_url,cover_url,tagline,description,problem,audience,category,website,sns,founded_at,is_featured,founder:founders(slug,name,avatar_url,headline,bio)",
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
          brandSlugs: [b.slug],
        });
      }
    }

    return { brands, products, founders: [...founderMap.values()] };
  } catch {
    return null;
  }
}

function mergeBySlug<T extends { slug: string }>(live: T[], mock: T[]): T[] {
  const liveSlugs = new Set(live.map((item) => item.slug));
  return [...live, ...mock.filter((item) => !liveSlugs.has(item.slug))];
}

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
