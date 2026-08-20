import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 관리 클라이언트 (RLS 우회).
 * 절대 클라이언트 컴포넌트에서 import하지 말 것 — 시크릿 키가 노출된다.
 * 조회수 적재 등 익명 사용자를 대신한 시스템 쓰기에만 사용한다.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
