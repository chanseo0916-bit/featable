"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/login-modal";
import { formatRelativeKst } from "@/lib/datetime";

interface CommentRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

/**
 * 댓글 — 프로덕트/스토리 공용.
 * 누구나 읽기, 로그인 유저 작성, 본인·관리자만 삭제 (RLS 강제).
 */
export function Comments({
  type,
  slug,
}: {
  type: "product" | "feature";
  slug: string;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [me, setMe] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const table = type === "product" ? "products" : "features";
  const fk = type === "product" ? "product_id" : "feature_id";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: target } = await supabase
          .from(table)
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!target || cancelled) return;

        const [{ data: comments }, { data: auth }] = await Promise.all([
          supabase
            .from("comments")
            .select("id, user_id, display_name, avatar_url, body, created_at")
            .eq(fk, target.id)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase.auth.getUser(),
        ]);

        let isAdmin = false;
        if (auth.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", auth.user.id)
            .maybeSingle();
          isAdmin = profile?.role === "admin";
        }

        if (!cancelled) {
          setTargetId(target.id);
          setRows((comments ?? []) as CommentRow[]);
          setMe(auth.user ? { id: auth.user.id, isAdmin } : null);
        }
      } catch {
        // 미설정 환경에서는 조용히 비활성
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [table, fk, slug]);

  async function submit() {
    if (!body.trim() || busy) return;
    if (!me) {
      setLoginOpen(true);
      return;
    }
    if (!targetId) return;
    setBusy(true);
    setNotice(null);
    try {
      const supabase = createClient();
      // 표시 이름: 파운더 프로필 이름 → 이메일 앞부분
      const { data: founder } = await supabase
        .from("founders")
        .select("name, avatar_url")
        .eq("user_id", me.id)
        .maybeSingle();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const displayName =
        founder?.name || user?.email?.split("@")[0] || "익명";

      const { data: inserted, error } = await supabase
        .from("comments")
        .insert({
          user_id: me.id,
          [fk]: targetId,
          display_name: displayName,
          avatar_url: founder?.avatar_url ?? null,
          body: body.trim().slice(0, 1000),
        })
        .select("id, user_id, display_name, avatar_url, body, created_at")
        .single();

      if (error || !inserted) {
        setNotice("댓글 등록에 실패했습니다.");
      } else {
        setRows((r) => [inserted as CommentRow, ...r]);
        setBody("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (!error) setRows((r) => r.filter((row) => row.id !== id));
  }

  // 대상이 DB에 없으면(목데이터) 댓글 비활성
  if (!targetId && rows.length === 0 && me === null) {
    // 초기 로딩 중이거나 목데이터 — targetId 확정 전에는 조용히 렌더 안 함
  }
  if (!targetId) return null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-14" id="comments">
      <p className="mb-1 text-[12px] font-semibold tracking-tight text-accent">댓글</p>
      <h2 className="mb-6 text-xl font-bold tracking-tight">
        댓글 <span className="text-sm font-normal text-muted">{rows.length}</span>
      </h2>

      <div className="mb-8">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => { if (!me) setLoginOpen(true); }}
          maxLength={1000}
          placeholder={me ? "생각과 피드백을 남겨보세요" : "로그인하고 댓글을 남겨보세요"}
          className="min-h-20 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        {notice && <p className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{notice}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted">{body.length}/1000</span>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !body.trim()}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "등록 중…" : "댓글 남기기"}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
          첫 번째 댓글을 남겨보세요.
        </p>
      ) : (
        <ul className="grid gap-4">
          {rows.map((row) => (
            <li key={row.id} className="flex gap-3">
              {row.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.avatar_url} alt="" className="h-9 w-9 rounded-full border border-border object-cover" />
              ) : (
                <div className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent-soft text-xs font-black text-accent">
                  {row.display_name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <b>{row.display_name}</b>
                  <span className="ml-2 text-muted">
                    {formatRelativeKst(row.created_at)}
                  </span>
                  {me && (me.id === row.user_id || me.isAdmin) && (
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className="ml-3 text-[11px] text-muted hover:text-red-500"
                    >
                      삭제
                    </button>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm leading-relaxed">{row.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </section>
  );
}
