"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ variant = "header" }: { variant?: "header" | "studio" }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    setFailed(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.replace("/");
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  if (variant === "studio") {
    return <button type="button" onClick={logout} disabled={pending} aria-live="polite">
      {failed ? "다시 시도" : pending ? "로그아웃 중…" : "로그아웃"}
    </button>;
  }

  return <button type="button" className="header-logout" title={failed ? "로그아웃에 실패했습니다. 다시 시도해주세요." : "로그아웃"} onClick={logout} disabled={pending} aria-live="polite">
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" /></svg>
    <span>{failed ? "다시 시도" : pending ? "로그아웃 중…" : "로그아웃"}</span>
  </button>;
}
