"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/login-modal";

export type SaveItemType = "product" | "feature" | "event" | "support";

export function SaveButton({
  itemType,
  slug,
  variant = "default",
  className,
}: {
  itemType: SaveItemType;
  slug: string;
  variant?: "default" | "icon";
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
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase
        .from("saved_items")
        .insert({ user_id: user.id, item_type: itemType, item_slug: slug });
      if (!error || error.code === "23505") setSaved(true);
    }
    setBusy(false);
  }

  const label = saved ? "저장됨" : "저장하기";
  return <>
    <button
      type="button"
      onClick={toggle}
      disabled={busy || !loaded}
      aria-pressed={saved}
      aria-label={saved ? "저장 목록에서 제거" : "내 저장 목록에 추가"}
      className={`${variant === "icon" ? "product-favorite" : "save-item-button"}${saved ? " is-favorite saved" : ""}${className ? ` ${className}` : ""}`}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {variant === "default" && <strong>{label}</strong>}
    </button>
    <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
  </>;
}
