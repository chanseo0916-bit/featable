"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const PROFILE_ROLES = [
  "대표 / CEO",
  "공동창업자",
  "CTO",
  "CMO",
  "COO",
  "CPO",
  "마케터",
  "프로덕트 매니저",
  "프로덕트 디자이너",
  "프로덕트 엔지니어",
  "소프트웨어 엔지니어",
  "디자이너",
  "기획자",
  "커뮤니티 매니저",
  "투자자",
  "파트너",
] as const;

const CUSTOM_ROLE = "__custom__";

/* SEED Field 스펙: 라벨 13px/700 위, 입력 44px 아래. 간격은 섹션 단위로 묶는다 */
const input = "profile-field-input w-full";
const label = "profile-field-label block";

export function ProfileEditor({
  initial,
  setupMode = false,
  afterSaveHref,
}: {
  initial: ProfileEditorInitial;
  setupMode?: boolean;
  afterSaveHref?: string;
}) {
  const router = useRouter();
  const initialRole = initial.role?.trim() ?? "";
  const [form, setForm] = useState<ProfileInput>({
    name: initial.name ?? "",
    role: initialRole,
    headline: initial.headline ?? "",
    bio: initial.bio ?? "",
    avatarUrl: initial.avatarUrl ?? "",
    instagram: initial.instagram ?? "",
    x: initial.x ?? "",
    linkedin: initial.linkedin ?? "",
    website: initial.website ?? "",
  });
  const [roleOption, setRoleOption] = useState(
    PROFILE_ROLES.includes(initialRole as (typeof PROFILE_ROLES)[number])
      ? initialRole
      : initialRole
        ? CUSTOM_ROLE
        : "",
  );
  const [slug, setSlug] = useState(initial.slug);
  const [open, setOpen] = useState(setupMode);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (patch: Partial<ProfileInput>) => setForm((f) => ({ ...f, ...patch }));

  async function uploadAvatar(file: File) {
    setUploading(true);
    setNotice(null);
    try {
      // 인앱 브라우저에서도 되도록 서버를 통해 올린다
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "profile");
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "업로드에 실패했습니다.");
      set({ avatarUrl: payload.url });
    } catch (uploadFailure) {
      const reason = uploadFailure instanceof Error && uploadFailure.message ? uploadFailure.message : "알 수 없는 오류";
      setNotice({ ok: false, text: `사진 업로드에 실패했습니다. (${reason})` });
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
      if (afterSaveHref) router.push(afterSaveHref);
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <section className={setupMode ? "simple-registration-card profile-setup-card" : "rounded-2xl border border-border bg-white p-8"}>
      {setupMode && <div className="simple-registration-heading profile-setup-heading"><span>STEP 1 · PROFILE</span><h1>인터뷰에 표시될 내 정보</h1><p>이름, 역할, 사진을 확인해주세요. 프로필을 저장하면 STEP 2 인터뷰 작성 화면으로 자동 이동합니다.</p></div>}
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          {!setupMode && <div className="profile-editor-summary flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-lg font-bold text-accent">
                  {form.name?.slice(0, 1) || "F"}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">{form.name || "내 프로필"}</h2>
                <p className="text-[13px] text-muted">{form.headline || "한 줄 소개를 등록해보세요"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {slug && (
                <Link href={`/founders/${slug}`} className="whitespace-nowrap text-[13px] font-bold text-accent hover:underline">
                  공개 프로필 보기 →
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="whitespace-nowrap rounded-lg border border-border px-4 py-2 text-[13px] font-bold transition-colors hover:border-accent hover:text-accent"
              >
                {open ? "접기" : "프로필 편집"}
              </button>
            </div>
          </div>}

          {open && (
        <div className={setupMode ? "profile-setup-fields" : "mt-8"}>

          {/* ── 기본 정보 ── */}
          {!setupMode && <p className="mb-5 text-[13px] font-bold text-fg-muted">기본 정보</p>}
          <div className="founder-avatar-picker-wrap">
            <span className={label}>프로필 이미지</span>
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
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            <label className={label}>이름 *
              <input className={`${input} mt-2`} value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className={label}>역할 *
              <select className={`${input} mt-2`} value={roleOption} onChange={(e) => {
                const value = e.target.value;
                setRoleOption(value);
                set({ role: value === CUSTOM_ROLE ? "" : value });
              }}>
                <option value="">역할을 선택해주세요</option>
                {PROFILE_ROLES.map((role) => <option value={role} key={role}>{role}</option>)}
                <option value={CUSTOM_ROLE}>기타 · 직접 입력</option>
              </select>
            </label>
          </div>
          {roleOption === CUSTOM_ROLE && <input className={`${input} mt-3`} value={form.role} maxLength={40} autoFocus placeholder="나의 역할을 직접 입력해주세요" onChange={(e) => set({ role: e.target.value })} />}

          <label className={`${label} mt-5 block`}>한 줄 소개
            <input className={`${input} mt-2`} value={form.headline} placeholder="기록을 사랑하는 개발자"
              onChange={(e) => set({ headline: e.target.value })} />
          </label>

          <label className={`${label} mt-5 block`}>이야기
            <textarea className={`${input} mt-2 min-h-28 py-3`} value={form.bio}
              placeholder="왜 창업했는지, 어떤 여정을 지나왔는지"
              onChange={(e) => set({ bio: e.target.value })} />
          </label>

          {/* ── SNS / 링크 ── */}
          {!setupMode && <p className="mb-5 mt-8 text-[13px] font-bold text-fg-muted">링크</p>}
          <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            <label className={label}>인스타그램
              <input className={`${input} mt-2`} value={form.instagram} placeholder="@handle 또는 링크"
                onChange={(e) => set({ instagram: e.target.value })} />
            </label>
            <label className={label}>X (트위터)
              <input className={`${input} mt-2`} value={form.x} placeholder="@handle 또는 링크"
                onChange={(e) => set({ x: e.target.value })} />
            </label>
            <label className={label}>링크드인
              <input className={`${input} mt-2`} value={form.linkedin} placeholder="프로필 링크"
                onChange={(e) => set({ linkedin: e.target.value })} />
            </label>
            <label className={label}>개인 사이트
              <input className={`${input} mt-2`} value={form.website} placeholder="https://"
                onChange={(e) => set({ website: e.target.value })} />
            </label>
          </div>

          {notice && (
            <p className={`mt-5 rounded-lg px-4 py-3 text-sm ${notice.ok ? "bg-accent-soft text-accent" : "bg-red-50 text-red-600"}`}>
              {notice.text}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="button button-small mt-6 w-full sm:w-auto"
          >
            {saving ? "저장 중…" : setupMode ? "저장하고 인터뷰 작성하기 →" : "프로필 저장"}
          </button>
        </div>
          )}
        </div>

        {/* 오른쪽: 항상 보이는 공개 카드 (편집 중에는 실시간 갱신) */}
        <aside className="self-start lg:sticky lg:top-6">
          <p className="mb-3 text-[13px] font-bold text-fg-muted">{setupMode ? "내 프로필 카드 미리보기" : "대표자 카드"}</p>
          <div className="pointer-events-none">
            <TeamProfileCard
              name={form.name || "이름을 입력하세요"}
              title={form.role || "역할을 선택해주세요"}
              headline={form.headline || "한 줄 소개가 여기에 표시됩니다"}
              avatarUrl={form.avatarUrl ?? ""}
              bio={form.bio || "브랜드에서 맡은 역할과 만드는 사람으로서의 이야기를 소개합니다."}
              label="파운더"
              founderNumber={initial.founderNumber}
              actionLabel="프로필"
            />
          </div>
          <p className="profile-card-note mt-3 leading-relaxed">
            {setupMode ? "저장하면 나만의 공개 프로필 카드로 사용할 수 있습니다." : "브랜드 페이지의 팀 섹션에 대표 카드로 표시돼요."}
          </p>
        </aside>
      </div>
    </section>
  );
}
