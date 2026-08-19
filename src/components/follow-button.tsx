"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/login-modal";

interface FollowState {
  brandId: string | null;
  count: number;
  following: boolean;
  loaded: boolean;
}

/**
 * 브랜드 팔로우 버튼 + 팔로워 수.
 * 비로그인 클릭 시 로그인 모달. 데모(목데이터) 브랜드는 버튼을 렌더하지 않는다.
 */
export function FollowButton({
  brandSlug,
  className,
}: {
  brandSlug: string;
  className?: string;
}) {
  const [state, setState] = useState<FollowState>({
    brandId: null,
    count: 0,
    following: false,
    loaded: false,
  });
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: brand } = await supabase
          .from("brands")
          .select("id")
          .eq("slug", brandSlug)
          .maybeSingle();
        if (!brand) {
          if (!cancelled) setState((s) => ({ ...s, loaded: true }));
          return;
        }

        const { count } = await supabase
          .from("brand_follows")
          .select("*", { count: "exact", head: true })
          .eq("brand_id", brand.id);

        let following = false;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: mine } = await supabase
            .from("brand_follows")
            .select("brand_id")
            .eq("brand_id", brand.id)
            .eq("user_id", user.id)
            .maybeSingle();
          following = Boolean(mine);
        }

        if (!cancelled) {
          setState({ brandId: brand.id, count: count ?? 0, following, loaded: true });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandSlug]);

  async function toggle() {
    if (!state.brandId || busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoginOpen(true);
        return;
      }

      if (state.following) {
        const { error } = await supabase
          .from("brand_follows")
          .delete()
          .eq("brand_id", state.brandId)
          .eq("user_id", user.id);
        if (!error) {
          setState((s) => ({ ...s, following: false, count: Math.max(0, s.count - 1) }));
        }
      } else {
        const { error } = await supabase
          .from("brand_follows")
          .insert({ brand_id: state.brandId, user_id: user.id });
        if (!error) {
          setState((s) => ({ ...s, following: true, count: s.count + 1 }));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  // 데모(목데이터) 브랜드는 DB에 없으므로 팔로우 불가 — 렌더 생략
  if (state.loaded && !state.brandId) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !state.loaded}
        aria-pressed={state.following}
        className={className ?? "outline-button"}
      >
        {state.following ? "♥ 팔로잉" : "♡ 팔로우"}
        {state.loaded && state.count > 0 && ` · ${state.count.toLocaleString("ko-KR")}`}
      </button>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
