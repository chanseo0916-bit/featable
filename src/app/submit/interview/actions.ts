"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomSuffix, slugify } from "@/lib/slug";
import { conciseSeoDescription } from "@/lib/content-seo";
import type { StoryBlock } from "@/lib/types";

export interface InterviewAnswer {
  question: string;
  answer: string;
}

export interface InterviewInput {
  /** 브랜드 연결은 선택 사항입니다. 로그인 사용자라면 개인 인터뷰를 게시할 수 있습니다. */
  brandId?: string;
  /** 훅 1줄: "03년생, 24살" */
  hookIntro: string;
  /** 훅 2줄 = 인터뷰 제목: "연구용 AI 스타트업 대표" */
  title: string;
  /** 훅 3줄: 꺾쇠 안 "카라멜 랩 이찬서" (비우면 브랜드+이름 자동) */
  hookLabel: string;
  coverUrl: string;
  answers: InterviewAnswer[];
}

export interface InterviewResult {
  ok: boolean;
  error?: string;
  slug?: string;
}

/** 파운더 본인 브랜드에 인터뷰(features.kind=interview)를 등록한다. RLS(owns_brand)로 소유권 검증. */
export async function createFounderInterview(input: InterviewInput): Promise<InterviewResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.title.trim()) return { ok: false, error: "나를 소개하는 한 줄을 입력해주세요." };
  if (!input.coverUrl) return { ok: false, error: "커버 사진을 올려주세요." };

  const answered = input.answers
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question && item.answer);
  if (answered.length < 2) return { ok: false, error: "질문에 최소 2개 이상 답해주세요." };

  const [{ data: founder }, { data: profile }] = await Promise.all([
    supabase.from("founders").select("id,name").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!founder) return { ok: false, error: "인터뷰를 작성하려면 먼저 Founder 프로필을 만들어주세요." };
  const { data: brand } = input.brandId
    ? await supabase.from("brands").select("id,slug,name").eq("id", input.brandId).eq("founder_id", founder.id).maybeSingle()
    : { data: null };
  if (input.brandId && !brand) return { ok: false, error: "브랜드를 찾을 수 없습니다." };
  const displayName = founder?.name || profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Featable 멤버";
  const brandName = brand?.name || "Featable";

  const body: StoryBlock[] = answered.map((item) => ({ type: "text", heading: item.question, body: item.answer }));
  const excerptSource = answered[0]?.answer ?? "";
  const now = new Date().toISOString();
  const baseRow = {
    title: input.title.trim(),
    kind: "interview",
    excerpt: excerptSource.length > 140 ? `${excerptSource.slice(0, 137)}...` : excerptSource,
    cover_url: input.coverUrl,
    body,
    status: "published",
    published_at: now,
    brand_id: brand?.id ?? null,
    founder_id: founder.id,
    seo_title: `${input.title.trim()} ${displayName} 인터뷰`.slice(0, 60),
    seo_description: conciseSeoDescription(`${brandName} ${displayName} 인터뷰. ${excerptSource}`),
    primary_keyword: `${displayName} 인터뷰`,
    secondary_keywords: [brandName, "창업가 인터뷰"],
    og_image_url: input.coverUrl,
    is_indexable: true,
    updated_at: now,
  };
  const hookColumns = {
    hook_intro: input.hookIntro.trim() || null,
    hook_label: input.hookLabel.trim() || null,
  };

  // Cloudflare의 정적 에셋 라우팅은 비ASCII 동적 경로를 앱에 넘기지 않아
  // 한글 이름으로 만든 인터뷰 주소가 저장 직후 404가 될 수 있다.
  const slugBase = brand?.slug ? slugify(brand.slug) : slugify(displayName);
  let slug = `${slugBase || "member"}-interview`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let { error } = await supabase.from("features").insert({ ...baseRow, ...hookColumns, slug } as never);
    if (error && /hook_intro|hook_label/.test(error.message ?? "")) {
      // migration-30 적용 전 DB 호환: 훅 컬럼 없이 저장
      ({ error } = await supabase.from("features").insert({ ...baseRow, slug } as never));
    }
    if (!error) {
      revalidatePath("/");
      revalidatePath("/stories");
      revalidatePath("/my");
      return { ok: true, slug };
    }
    if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
      slug = `${slugBase || "member"}-interview-${randomSuffix()}`;
      continue;
    }
    return { ok: false, error: "인터뷰 저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }
  return { ok: false, error: "인터뷰 주소 생성에 실패했습니다. 다시 시도해주세요." };
}

/** 작성자 본인의 인터뷰만 수정한다. 공개 여부와 관계없이 slug는 유지한다. */
export async function updateFounderInterview(slug: string, input: InterviewInput): Promise<InterviewResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!slug || !input.title.trim()) return { ok: false, error: "나를 소개하는 한 줄을 입력해주세요." };
  if (!input.coverUrl) return { ok: false, error: "커버 사진을 올려주세요." };

  const answered = input.answers
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question && item.answer);
  if (answered.length < 2) return { ok: false, error: "질문에 최소 2개 이상 답해주세요." };

  const [{ data: founder }, { data: profile }] = await Promise.all([
    supabase.from("founders").select("id,name").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!founder) return { ok: false, error: "Founder 프로필을 찾을 수 없습니다." };

  const { data: interview } = await supabase
    .from("features")
    .select("id,slug,founder_id,kind")
    .eq("slug", slug)
    .eq("kind", "interview")
    .maybeSingle();
  if (!interview || interview.founder_id !== founder.id) {
    return { ok: false, error: "본인이 작성한 인터뷰만 수정할 수 있습니다." };
  }

  const { data: brand } = input.brandId
    ? await supabase.from("brands").select("id,name").eq("id", input.brandId).eq("founder_id", founder.id).maybeSingle()
    : { data: null };
  if (input.brandId && !brand) return { ok: false, error: "본인이 소유한 브랜드만 연결할 수 있습니다." };

  const displayName = founder.name || profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Featable 멤버";
  const brandName = brand?.name || "Featable";
  const excerptSource = answered[0]?.answer ?? "";
  const row = {
    title: input.title.trim(),
    excerpt: excerptSource.length > 140 ? `${excerptSource.slice(0, 137)}...` : excerptSource,
    cover_url: input.coverUrl,
    body: answered.map((item) => ({ type: "text", heading: item.question, body: item.answer })) as StoryBlock[],
    brand_id: brand?.id ?? null,
    seo_title: `${input.title.trim()} ${displayName} 인터뷰`.slice(0, 60),
    seo_description: conciseSeoDescription(`${brandName} ${displayName} 인터뷰. ${excerptSource}`),
    primary_keyword: `${displayName} 인터뷰`,
    secondary_keywords: [brandName, "창업가 인터뷰"],
    og_image_url: input.coverUrl,
    is_indexable: true,
    updated_at: new Date().toISOString(),
  };
  const hookColumns = {
    hook_intro: input.hookIntro.trim() || null,
    hook_label: input.hookLabel.trim() || null,
  };

  let { error } = await supabase.from("features").update({ ...row, ...hookColumns } as never).eq("id", interview.id);
  if (error && /hook_intro|hook_label/.test(error.message ?? "")) {
    ({ error } = await supabase.from("features").update(row as never).eq("id", interview.id));
  }
  if (error) return { ok: false, error: "인터뷰 수정에 실패했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath("/");
  revalidatePath("/stories");
  revalidatePath(`/stories/${slug}`);
  revalidatePath("/my");
  return { ok: true, slug };
}
