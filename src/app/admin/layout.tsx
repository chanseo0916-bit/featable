import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s | Featable 관리자" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (profile?.role !== "admin") {
    return (
      <main className="admin-access-denied">
        <p>FEATABLE ADMIN</p>
        <h1>접근 권한이 없습니다.</h1>
        <span>관리자 계정으로 로그인한 뒤 다시 시도해주세요.</span>
      </main>
    );
  }
  return <AdminShell>{children}</AdminShell>;
}
