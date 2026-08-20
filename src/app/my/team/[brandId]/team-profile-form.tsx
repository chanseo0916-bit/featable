"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { TeamProfileCard } from "@/components/team-profile-card";
import { updateTeamProfile, type TeamProfileInput } from "../../team-actions";

export function TeamProfileForm({ initial }: { initial: TeamProfileInput }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<TeamProfileInput>) => setForm((current) => ({ ...current, ...patch }));

  async function upload(file: File) {
    setUploading(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");
      const extension = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}-team.${extension}`;
      const { error } = await supabase.storage.from("images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      set({ avatarUrl: data.publicUrl });
    } catch {
      setNotice({ ok: false, text: "이미지를 업로드하지 못했습니다." });
    } finally {
      setUploading(false);
    }
  }

  function save() {
    setNotice(null);
    startTransition(async () => {
      const result = await updateTeamProfile(form);
      setNotice(result.ok
        ? { ok: true, text: "팀 프로필을 저장했습니다." }
        : { ok: false, text: result.error });
    });
  }

  return <div className="team-profile-editor-grid">
    <section className="team-profile-form-card">
      <label>프로필 사진</label>
      <div className="team-profile-photo-field">
        <div>{form.avatarUrl ? <img src={form.avatarUrl} alt="" /> : <span>{form.displayName.slice(0, 1) || "T"}</span>}</div>
        <label className="team-profile-upload">{uploading ? "업로드 중…" : "사진 선택"}<input type="file" accept="image/*" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} /></label>
      </div>

      <label htmlFor="team-name">이름 *</label>
      <input id="team-name" value={form.displayName} onChange={(event) => set({ displayName: event.target.value })} />
      <label htmlFor="team-title">팀 내 역할 *</label>
      <input id="team-title" value={form.title} placeholder="예: Product Designer" onChange={(event) => set({ title: event.target.value })} />
      <label htmlFor="team-bio">한 줄 소개</label>
      <textarea id="team-bio" value={form.bio} placeholder="팀에서 어떤 일을 맡고 있는지 소개해주세요." onChange={(event) => set({ bio: event.target.value })} />
      <label className="team-profile-public-toggle">
        <input type="checkbox" checked={form.isPublic} onChange={(event) => set({ isPublic: event.target.checked })} />
        <span><strong>브랜드 페이지에 공개</strong><small>끄면 공동 편집 권한은 유지되고 프로필만 숨겨집니다.</small></span>
      </label>
      {notice && <p className={notice.ok ? "success" : "error"}>{notice.text}</p>}
      <button type="button" disabled={pending || uploading} onClick={save}>{pending ? "저장 중…" : "팀 프로필 저장"}</button>
    </section>

    <aside className="team-profile-live-card team-profile-card-preview">
      <p className="team-profile-preview-label">PREVIEW</p>
      <TeamProfileCard
        name={form.displayName || "이름"}
        title={form.title || "팀 내 역할"}
        avatarUrl={form.avatarUrl}
        bio={form.bio || "팀에서 맡고 있는 일을 한 줄로 소개해주세요."}
        label="TEAM"
        muted={!form.isPublic}
      />
      <div hidden>
      <span>PREVIEW</span>
      <div>{form.avatarUrl ? <img src={form.avatarUrl} alt="" /> : <i>{form.displayName.slice(0, 1) || "T"}</i>}</div>
      <h2>{form.displayName || "이름"}</h2>
      <strong>{form.title || "팀 내 역할"}</strong>
      <p>{form.bio || "팀에서 맡고 있는 일을 한 줄로 소개해주세요."}</p>
      <small>{form.isPublic ? "브랜드 페이지에 공개됩니다" : "현재 비공개 상태입니다"}</small>
      </div>
    </aside>
  </div>;
}
