"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  mentor_name: string;
  mentor_field: string;
  comment: string;
  created_at: string;
}

type Mode = "hidden" | "mentor" | "owner";

/**
 * 멘토 노트 — 비공개 피드백.
 * mentor 권한 유저: 이 제품에 노트 작성 가능 (파운더에게만 보임)
 * 제품 소유 파운더: 받은 노트 열람
 * 그 외 방문자: 아무것도 렌더하지 않음
 */
export function MentorNotes({ productSlug }: { productSlug: string }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [productId, setProductId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [mentorName, setMentorName] = useState("");
  const [field, setField] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: profile }, { data: product }] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase
            .from("products")
            .select("id, brand:brands(founder:founders(user_id, name))")
            .eq("slug", productSlug)
            .maybeSingle(),
        ]);
        if (!product || cancelled) return;

        const founderUserId = (
          product as unknown as { brand: { founder: { user_id: string } | null } | null }
        ).brand?.founder?.user_id;

        const isMentor = profile?.role === "mentor" || profile?.role === "admin";
        const isOwner = founderUserId === user.id;

        if (!isMentor && !isOwner) return;

        // RLS가 열람 범위를 강제하므로 그대로 조회
        const { data: rows } = await supabase
          .from("mentor_notes")
          .select("id, mentor_name, mentor_field, comment, created_at")
          .eq("product_id", product.id)
          .order("created_at", { ascending: false });

        // 멘토 기본 이름: 본인 파운더 프로필 이름
        let defaultName = "";
        if (isMentor) {
          const { data: me } = await supabase
            .from("founders")
            .select("name")
            .eq("user_id", user.id)
            .maybeSingle();
          defaultName = me?.name ?? "";
        }

        if (!cancelled) {
          setProductId(product.id);
          setNotes((rows ?? []) as Note[]);
          setMentorName(defaultName);
          setMode(isMentor && !isOwner ? "mentor" : "owner");
        }
      } catch {
        // 비로그인/미설정 환경에서는 조용히 숨김
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  async function submit() {
    if (!productId || !comment.trim() || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inserted, error } = await supabase
        .from("mentor_notes")
        .insert({
          mentor_user_id: user.id,
          product_id: productId,
          mentor_name: mentorName.trim() || "멘토",
          mentor_field: field.trim() || "Mentor",
          comment: comment.trim(),
        })
        .select("id, mentor_name, mentor_field, comment, created_at")
        .single();
      if (error || !inserted) {
        setNotice("등록에 실패했습니다. 멘토 권한을 확인해주세요.");
      } else {
        setNotes((n) => [inserted as Note, ...n]);
        setComment("");
        setNotice("노트를 남겼습니다. 이 노트는 파운더에게만 보입니다.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === "hidden") return null;

  const input =
    "w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent";

  return (
    <section id="mentor" className="mx-auto max-w-2xl px-6 py-14">
      <p className="mb-1 text-[11px] font-extrabold tracking-[0.13em] text-accent">
        MENTOR&apos;S NOTE
      </p>
      <h2 className="mb-1 text-xl font-bold tracking-tight">
        {mode === "mentor" ? "이 파운더에게 노트 남기기" : "받은 멘토 노트"}
      </h2>
      <p className="mb-6 text-xs text-muted">
        멘토 노트는 공개되지 않으며, 이 제품을 등록한 파운더에게만 보입니다.
      </p>

      {mode === "mentor" && (
        <div className="mb-8 rounded-2xl border border-border p-5">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <input className={input} value={mentorName} placeholder="이름"
              onChange={(e) => setMentorName(e.target.value)} />
            <input className={input} value={field} placeholder="분야 (예: Marketing)"
              onChange={(e) => setField(e.target.value)} />
          </div>
          <textarea className={`${input} min-h-24`} value={comment}
            placeholder="이 제품이 더 좋아지려면 무엇이 필요할까요?"
            onChange={(e) => setComment(e.target.value)} />
          {notice && (
            <p className="mt-3 rounded-lg bg-accent-soft px-4 py-3 text-xs text-accent">{notice}</p>
          )}
          <button type="button" onClick={submit} disabled={busy || !comment.trim()}
            className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50">
            {busy ? "등록 중…" : "노트 남기기"}
          </button>
        </div>
      )}

      {notes.length > 0 ? (
        <div className="grid gap-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-border p-5">
              <blockquote className="mb-3 text-sm leading-relaxed">
                &ldquo;{note.comment}&rdquo;
              </blockquote>
              <p className="text-xs font-bold">
                {note.mentor_name}
                <span className="ml-2 font-medium text-muted">
                  {note.mentor_field} · FEATABLE MENTOR ·{" "}
                  {new Date(note.created_at).toLocaleDateString("ko-KR")}
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        mode === "owner" && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            아직 받은 멘토 노트가 없습니다.
          </p>
        )
      )}
    </section>
  );
}
