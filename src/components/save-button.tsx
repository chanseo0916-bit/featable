"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/login-modal";

/** 한 페이지에 같은 항목의 버튼이 여러 개 있을 때 서로 상태를 맞추기 위한 이벤트 */
const SAVE_CHANGED = "featable:save-changed";

export type SaveItemType = "product" | "feature" | "event" | "support";

export function SaveButton({
  itemType,
  slug,
  variant = "default",
  labelMode = "save",
  className,
}: {
  itemType: SaveItemType;
  slug: string;
  variant?: "default" | "icon";
  labelMode?: "save" | "like";
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("saved_items")
        .select("item_slug")
        .eq("user_id", user.id)
        .eq("item_type", itemType)
        .eq("item_slug", slug)
        .maybeSingle();
      if (!cancelled) {
        setSaved(Boolean(data));
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [itemType, slug]);

  // 같은 항목의 버튼이 여러 곳에 있을 수 있어 서로 상태를 맞춘다
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ itemType: string; slug: string; saved: boolean }>).detail;
      if (detail.itemType === itemType && detail.slug === slug) setSaved(detail.saved);
    };
    window.addEventListener(SAVE_CHANGED, sync);
    return () => window.removeEventListener(SAVE_CHANGED, sync);
  }, [itemType, slug]);

  function broadcast(next: boolean) {
    window.dispatchEvent(new CustomEvent(SAVE_CHANGED, { detail: { itemType, slug, saved: next } }));
  }

  async function toggle() {
    if (busy) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoginOpen(true);
      return;
    }

    setBusy(true);
    if (saved) {
      const { error } = await supabase
        .from("saved_items")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", itemType)
        .eq("item_slug", slug);
      if (!error) { setSaved(false); broadcast(false); }
    } else {
      const { error } = await supabase
        .from("saved_items")
        .insert({ user_id: user.id, item_type: itemType, item_slug: slug });
      if (!error || error.code === "23505") { setSaved(true); broadcast(true); }
    }
    setBusy(false);
  }

  const label = labelMode === "like"
    ? saved ? "좋아요 취소" : "좋아요"
    : saved ? "저장됨" : "저장하기";
  return <>
    <button
      type="button"
      onClick={toggle}
      disabled={busy || !loaded}
      aria-pressed={saved}
      aria-label={labelMode === "like"
        ? saved ? "좋아요 취소" : "좋아요 누르기"
        : saved ? "저장 목록에서 제거" : "내 저장 목록에 추가"}
      className={`${variant === "icon" ? "product-favorite" : "save-item-button"}${labelMode === "like" ? " like-item-button" : ""}${saved ? " is-favorite saved" : ""}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {variant === "default" && <strong>{label}</strong>}
    </button>
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
  </>;
}
