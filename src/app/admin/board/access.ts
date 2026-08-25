import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminAccessErrorReason =
  | "auth_unavailable"
  | "unauthenticated"
  | "profile_lookup_failed"
  | "not_admin"
  | "service_unavailable";

export type AdminAccessFailure = {
  ok: false;
  reason: AdminAccessErrorReason;
  error: string;
};

export type AdminAccessSuccess = {
  ok: true;
  admin: NonNullable<ReturnType<typeof createAdminClient>>;
  userId: User["id"];
};

export type BoardAdminAccess = AdminAccessSuccess | AdminAccessFailure;

/**
 * Board moderation always verifies the caller with the session-bound client
 * before creating a service-role client. Never call createAdminClient() from
 * a client component or based on a client-supplied role/flag.
 */
export async function getBoardAdminAccess(): Promise<BoardAdminAccess> {
  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false,
      reason: "auth_unavailable",
      error: "관리자 인증을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  let user: User | null = null;
  let userError: unknown = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    userError = result.error;
  } catch (error) {
    userError = error;
  }

  if (userError || !user) {
    return {
      ok: false,
      reason: "unauthenticated",
      error: "관리자 로그인이 필요합니다.",
    };
  }

  let profile: { role?: string | null } | null = null;
  let profileError: unknown = null;
  try {
    const result = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profile = result.data as { role?: string | null } | null;
    profileError = result.error;
  } catch (error) {
    profileError = error;
  }

  if (profileError) {
    return {
      ok: false,
      reason: "profile_lookup_failed",
      error: "관리자 권한을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  if (profile?.role !== "admin") {
    return {
      ok: false,
      reason: "not_admin",
      error: "게시판을 관리할 권한이 없습니다.",
    };
  }

  let admin: ReturnType<typeof createAdminClient> = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }
  if (!admin) {
    return {
      ok: false,
      reason: "service_unavailable",
      error: "관리자 서버 설정을 확인할 수 없습니다.",
    };
  }

  return { ok: true, admin, userId: user.id };
}
