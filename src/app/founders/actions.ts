"use server";

import { createClient } from "@/lib/supabase/server";

export type FounderSupportState = {
  ok: boolean;
  count: number;
  supported: boolean;
  loginRequired?: boolean;
  error?: string;
};

async function findFounderId(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("founders")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return { supabase, founderId: null };
  return { supabase, founderId: data.id as string };
}

async function readSupportState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  founderId: string,
  userId?: string,
): Promise<FounderSupportState> {
  const [{ count, error: countError }, { data: mine, error: mineError }] = await Promise.all([
    supabase
      .from("founder_supports")
      .select("founder_id", { count: "exact", head: true })
      .eq("founder_id", founderId),
    userId
      ? supabase
          .from("founder_supports")
          .select("founder_id")
          .eq("founder_id", founderId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (countError || mineError) {
    return { ok: false, count: 0, supported: false, error: "응원 정보를 불러오지 못했어요." };
  }

  return { ok: true, count: count ?? 0, supported: Boolean(mine) };
}

export async function getFounderSupportState(slug: string): Promise<FounderSupportState> {
  const { supabase, founderId } = await findFounderId(slug);
  if (!founderId) return { ok: true, count: 0, supported: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return readSupportState(supabase, founderId, user?.id);
}

export async function toggleFounderSupport(
  slug: string,
  nextSupported: boolean,
): Promise<FounderSupportState> {
  const { supabase, founderId } = await findFounderId(slug);
  if (!founderId) return { ok: false, count: 0, supported: false, error: "Founder를 찾을 수 없어요." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, count: 0, supported: false, loginRequired: true };
  }

  if (nextSupported) {
    const { error } = await supabase
      .from("founder_supports")
      .insert({ user_id: user.id, founder_id: founderId });
    if (error && error.code !== "23505") {
      return { ok: false, count: 0, supported: false, error: "응원에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
  } else {
    const { error } = await supabase
      .from("founder_supports")
      .delete()
      .eq("user_id", user.id)
      .eq("founder_id", founderId);
    if (error) {
      return { ok: false, count: 0, supported: true, error: "응원 취소에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
  }

  return readSupportState(supabase, founderId, user.id);
}
