"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? supabase : null;
}

export type AdminTable = "brands" | "products";

export async function setFeatured(
  table: AdminTable,
  id: string,
  value: boolean,
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase
    .from(table)
    .update({ is_featured: value })
    .eq("id", id);
  if (error) return { error: "변경에 실패했습니다." };

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function setStatus(
  table: AdminTable,
  id: string,
  status: "published" | "hidden",
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();
  if (!supabase) return { error: "관리자 권한이 없습니다." };

  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) return { error: "변경에 실패했습니다." };

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}
