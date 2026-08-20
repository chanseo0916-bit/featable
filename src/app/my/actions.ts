"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/slug";
import { isMemberType } from "@/lib/auth";

export async function updateMemberType(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const memberType = String(formData.get("memberType") ?? "");
  if (!isMemberType(memberType)) return;

  await supabase.from("profiles").update({ member_type: memberType }).eq("id", user.id);
  revalidatePath("/my");
  revalidatePath("/my/settings");
}

export async function toggleBrandVisibility(brandId: string, publish: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data: changed, error } = await supabase.rpc("set_brand_publication_state", {
    p_brand_id: brandId,
    p_publish: publish,
  });
  if (error || changed !== true) {
    return { ok: false, error: "상태 변경에 실패했습니다." };
  }
  revalidatePath("/my");
  revalidatePath("/brands");
  return { ok: true };
}

export interface ProfileInput {
  name: string;
  headline: string;
  bio?: string;
  avatarUrl?: string;
  instagram?: string;
  x?: string;
  linkedin?: string;
  website?: string;
}

export type ProfileResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/** 파운더 프로필 저장 — 프로필이 없으면 생성(브랜드 등록 전에도 세팅 가능) */
export async function updateFounderProfile(
  input: ProfileInput,
): Promise<ProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input.name.trim()) return { ok: false, error: "이름은 필수입니다." };

  const sns = {
    ...(input.instagram?.trim() ? { instagram: input.instagram.trim() } : {}),
    ...(input.x?.trim() ? { x: input.x.trim() } : {}),
    ...(input.linkedin?.trim() ? { linkedin: input.linkedin.trim() } : {}),
    ...(input.website?.trim() ? { website: input.website.trim() } : {}),
  };

  const { data: existing } = await supabase
    .from("founders")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("founders")
      .update({
        name: input.name.trim(),
        headline: input.headline.trim(),
        bio: input.bio?.trim() || null,
        avatar_url: input.avatarUrl || null,
        sns,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "저장에 실패했습니다." };
    revalidatePath("/my");
    revalidatePath(`/founders/${existing.slug}`);
    return { ok: true, slug: existing.slug };
  }

  const base = slugify(input.name) || "founder";
  const slug = `${base}-${randomSuffix()}`;
  const { error } = await supabase.from("founders").insert({
    user_id: user.id,
    slug,
    name: input.name.trim(),
    headline: input.headline.trim(),
    bio: input.bio?.trim() || null,
    avatar_url: input.avatarUrl || null,
    sns,
  });
  if (error) return { ok: false, error: "프로필 생성에 실패했습니다." };
  revalidatePath("/my");
  return { ok: true, slug };
}
