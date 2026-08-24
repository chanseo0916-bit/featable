"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface PartnerEditInput { name: string; logoUrl: string; field: string; intro: string; description: string; website: string; status: "published" | "hidden"; }
type Result = { ok: true; savedAt: number } | { ok: false; error: string };
const clean = (value: string, max: number) => value.trim().slice(0, max);
const validUrl = (value: string) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };

export async function updateOwnedPartner(id: string, input: PartnerEditInput): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data: owned } = await supabase.from("partners").select("id").eq("id", id).eq("owner_user_id", user.id).maybeSingle();
  if (!owned) return { ok: false, error: "이 파트너 프로필을 수정할 권한이 없습니다." };
  const payload = { name: clean(input.name, 100), logoUrl: clean(input.logoUrl, 500), field: clean(input.field, 60), intro: clean(input.intro, 180), description: clean(input.description, 2000), website: clean(input.website, 500), status: input.status };
  if (payload.name.length < 2 || !payload.field || payload.intro.length < 5) return { ok: false, error: "이름, 분야, 한 줄 소개를 확인해주세요." };
  if (!payload.logoUrl || !validUrl(payload.logoUrl)) return { ok: false, error: "로고 이미지를 등록해주세요." };
  if (!validUrl(payload.website)) return { ok: false, error: "연결할 웹사이트 주소를 확인해주세요." };
  const { error } = await supabase.from("partners").update({ name: payload.name, logo_url: payload.logoUrl, field: payload.field, intro: payload.intro, description: payload.description || payload.intro, href: payload.website, status: payload.status }).eq("id", owned.id).eq("owner_user_id", user.id);
  if (error) return { ok: false, error: `파트너 프로필을 저장하지 못했습니다: ${error.message}` };
  ["/", "/partners", "/my", "/my/partners", `/my/partners/${id}`, "/sitemap.xml"].forEach((path) => revalidatePath(path));
  return { ok: true, savedAt: Date.now() };
}
