"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TeamProfileCard } from "@/components/team-profile-card";
import { updateFounderProfile, type ProfileInput } from "./actions";

export interface ProfileEditorInitial extends ProfileInput {
  founderNumber?: number;
  slug?: string;
}

const AVATAR_PRESETS = Array.from({ length: 6 }, (_, index) => ({
  value: `/avatars/founder-${String(index + 1).padStart(2, "0")}.svg`,
  label: `캐릭터 ${index + 1}`,
}));

export function ProfileEditor({
  initial,
  brandCount = 0,
}: {
  initial: ProfileEditorInitial;
  brandCount?: number;
}) {
  const [form, setForm] = useState<ProfileInput>({
    name: initial.name ?? "",
    headline: initial.headline ?? "",
    bio: initial.bio ?? "",
    avatarUrl: initial.avatarUrl ?? "",
    instagram: initial.instagram ?? "",
    x: initial.x ?? "",
    linkedin: initial.linkedin ?? "",
    website: initial.website ?? "",
  });
  const [slug, setSlug] = useState(initial.slug);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (patch: Partial<ProfileInput>) => setForm((f) => ({ ...f, ...patch }));

  async function uploadAvatar(file: File) {
    setUploading(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("no auth");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}-avatar.${ext}`;
      const { error } = await supabase.storage.from("images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      set({ avatarUrl: data.publicUrl });
    } catch {
      setNotice({ ok: false, text: "사진 업로드에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    const result = await updateFounderProfile(form);
    setSaving(false);
    if (result.ok) {
      setSlug(result.slug);
      setNotice({ ok: true, text: "프로필이 저장되었습니다." });
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const input =
    "w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent";
  const label = "mb-1 mt-3 block text-xs font-semibold text-muted";

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-lg font-black text-accent">
                  {form.name?.slice(0, 1) || "F"}
                </div>
              )}
              <div>
                <h2 className="font-bold">{form.name || "팀 프로필"}</h2>
                <p className="text-xs text-muted">{form.headline || "한 줄 소개를 등록해보세요"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {slug && (
                <Link href={`/founders/${slug}`} className="text-xs font-semibold text-accent hover:underline">
                  공개 프로필 보기 →
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold transition-colors hover:border-accent hover:text-accent"
              >
                {open ? "접기" : "프로필 편집"}
              </button>
            </div>
          </div>

          {!open && (
            <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted">
              대표자는 브랜드 팀의 첫 번째 멤버로 표시됩니다. &lsquo;프로필 편집&rsquo;을 누르면
              팀 카드와 Founder 페이지에 쓰이는 정보를 함께 수정할 수 있습니다.
            </p>
          )}

          {open && (
        <div className="mt-6 border-t border-border pt-5">
          <label className={label}>프로필 캐릭터</label>
          <div className="founder-avatar-picker">
            {AVATAR_PRESETS.map((avatar) => (
              <button className={form.avatarUrl === avatar.value ? "active" : ""} type="button" aria-label={avatar.label} aria-pressed={form.avatarUrl === avatar.value} key={avatar.value} onClick={() => set({ avatarUrl: avatar.value })}>
                <img src={avatar.value} alt="" />
                <span>{form.avatarUrl === avatar.value ? "선택됨" : avatar.label}</span>
              </button>
            ))}
          </div>
          <div className="founder-photo-option">
            <span>캐릭터 대신 내 사진을 사용하고 싶다면</span>
            <label>
              {uploading ? "업로드 중…" : "사진 업로드"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <div>
              <label className={label}>이름 *</label>
              <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label className={label}>한 줄 소개</label>
              <input className={input} value={form.headline} placeholder="기록을 사랑하는 개발자"
                onChange={(e) => set({ headline: e.target.value })} />
            </div>
          </div>

          <label className={label}>이야기</label>
          <textarea className={`${input} min-h-24`} value={form.bio}
            placeholder="왜 창업했는지, 어떤 여정을 지나왔는지"
            onChange={(e) => set({ bio: e.target.value })} />

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <div>
              <label className={label}>인스타그램</label>
              <input className={input} value={form.instagram} placeholder="@handle 또는 링크"
                onChange={(e) => set({ instagram: e.target.value })} />
            </div>
            <div>
              <label className={label}>X (트위터)</label>
              <input className={input} value={form.x} placeholder="@handle 또는 링크"
                onChange={(e) => set({ x: e.target.value })} />
            </div>
            <div>
              <label className={label}>링크드인</label>
              <input className={input} value={form.linkedin} placeholder="프로필 링크"
                onChange={(e) => set({ linkedin: e.target.value })} />
            </div>
            <div>
              <label className={label}>개인 사이트</label>
              <input className={input} value={form.website} placeholder="https://"
                onChange={(e) => set({ website: e.target.value })} />
            </div>
          </div>

          {notice && (
            <p className={`mt-4 rounded-lg px-4 py-3 text-xs ${notice.ok ? "bg-accent-soft text-accent" : "bg-red-50 text-red-600"}`}>
              {notice.text}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "저장 중…" : "프로필 저장"}
          </button>
        </div>
          )}
        </div>

        {/* 오른쪽: 항상 보이는 공개 카드 (편집 중에는 실시간 갱신) */}
        <aside className="self-start lg:sticky lg:top-6">
          <p className="mb-2 text-xs font-semibold text-muted">대표자 팀 카드</p>
          <div className="pointer-events-none">
            <TeamProfileCard
              name={form.name || "이름을 입력하세요"}
              title={form.headline || "한 줄 소개가 여기에 표시됩니다"}
              avatarUrl={form.avatarUrl ?? ""}
              bio={form.bio || "브랜드에서 맡은 역할과 만드는 사람으로서의 이야기를 소개합니다."}
              label="OWNER"
              founderNumber={initial.founderNumber}
              actionLabel="프로필"
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            브랜드의 TEAM PROFILE에서 대표자 카드로 노출됩니다.
          </p>
        </aside>
      </div>
    </section>
  );
}
