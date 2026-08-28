"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeamProfileCard } from "@/components/team-profile-card";
import { SeedSelect } from "@/components/seed-select";
import { Snackbar } from "@/components/snackbar";
import { updateFounderProfile, type ProfileInput } from "./actions";

export interface ProfileEditorInitial extends ProfileInput {
  founderNumber?: number;
  slug?: string;
}

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
const input =
  "w-full rounded-lg border border-border bg-white px-4 h-11 text-base text-fg-strong outline-none transition-colors placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent-soft";
const label = "block mb-2 text-[13px] font-bold text-fg-default";

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
    <section className={setupMode ? "simple-registration-card profile-setup-card" : ""}>
      {setupMode && <div className="simple-registration-heading profile-setup-heading"><span>STEP 1 · PROFILE</span><h1>인터뷰에 표시될 내 정보</h1><p>이름, 역할, 사진을 확인해주세요. 프로필을 저장하면 STEP 2 인터뷰 작성 화면으로 자동 이동합니다.</p></div>}
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          {!setupMode && <div className="flex flex-wrap items-center justify-between gap-4 pb-7 border-b border-border">
            <div className="flex items-center gap-4">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
              ) : (
                              <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <circle cx="12" cy="8" r="3.5" />
                                  <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
                                </svg>
                              </div>
                            )}
              <div>
                <h2 className="text-lg font-bold">{form.name || "팀 프로필"}</h2>
                <p className="text-[13px] text-muted">{form.headline || "한 줄 소개를 등록해보세요"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
              {slug && (
                <Link href={`/founders/${slug}`} className="button button-xsmall button-soft whitespace-nowrap">
                  공개 프로필 보기 ↗
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="button button-xsmall whitespace-nowrap"
              >
                {open ? "접기" : "프로필 편집"}
              </button>
            </div>
          </div>}

          {open && (
                  <div className={setupMode ? "profile-setup-fields" : "profile-editor-open mt-8"}>

                    {/* ▍프로필 사진 */}
                                        <fieldset className="profile-sec">
                                          <legend className="profile-sec-head"><h3>프로필 사진</h3></legend>
                                          <div className="profile-avatar-wrap">
                                            <label className={`profile-avatar-upload${form.avatarUrl ? "" : " is-empty"}`} title={form.avatarUrl ? "프로필 사진 변경" : "프로필 사진 업로드"}>
                                              {form.avatarUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={form.avatarUrl} alt="" className="profile-avatar-photo" />
                                              ) : (
                                                <svg className="profile-avatar-person" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                  <circle cx="12" cy="8" r="3.5" />
                                                  <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
                                                </svg>
                                              )}
                                              <span className="profile-avatar-plus" aria-hidden="true">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                              </span>
                                              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                                                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                                            </label>
                                            <div className="profile-avatar-meta">
                                              <strong>{uploading ? "업로드 중…" : form.avatarUrl ? "프로필 사진" : "기본 프로필 아이콘"}</strong>
                                              {form.avatarUrl && (
                                                <button type="button" className="profile-avatar-remove" onClick={() => set({ avatarUrl: "" })}>
                                                  기본 이미지로 되돌리기
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          <p className="field-helper">기본 아이콘을 그대로 쓰거나, 마우스를 올리고 <i>+</i>를 눌러 사진으로 바꿔보세요.</p>
                                        </fieldset>

                                        {/* ▍기본 정보 */}
                                        <fieldset className="profile-sec">
                                          <legend className="profile-sec-head"><h3>기본 정보</h3></legend>
                                          <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                                            <div className="seed-field">
                                              <label className={label} htmlFor="profile-name">이름 *</label>
                                              <input id="profile-name" className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} />
                                            </div>
                                            <div className="seed-field">
                                              <label className={label} htmlFor="profile-role">역할 *</label>
                                              <SeedSelect
                                                id="profile-role"
                                                value={roleOption}
                                                onChange={(v) => { setRoleOption(v); set({ role: v === CUSTOM_ROLE ? "" : v }); }}
                                                placeholder="역할을 선택해주세요"
                                                options={[
                                                  ...PROFILE_ROLES.map((r) => ({ value: r, label: r })),
                                                  { value: CUSTOM_ROLE, label: "기타 · 직접 입력" },
                                                ]}
                                              />
                                              <p className="field-helper">자신을 가장 잘 표현하는 역할을 골라주세요.</p>
                                            </div>
                                          </div>
                                          {roleOption === CUSTOM_ROLE && (
                                            <div className="seed-field mt-5">
                                              <label className={label} htmlFor="profile-role-custom">역할 직접 입력</label>
                                              <input id="profile-role-custom" className={input} value={form.role} maxLength={40} autoFocus placeholder="나의 역할을 직접 입력해주세요" onChange={(e) => set({ role: e.target.value })} />
                                            </div>
                                          )}

                                          <div className="seed-field mt-5">
                                            <label className={label} htmlFor="profile-headline">한 줄 소개</label>
                                            <input id="profile-headline" className={input} value={form.headline} placeholder="기록을 사랑하는 개발자"
                                              onChange={(e) => set({ headline: e.target.value })} />
                                          </div>

                                          <div className="seed-field mt-5">
                                            <label className={label} htmlFor="profile-bio">이야기</label>
                                            <textarea id="profile-bio" className={`${input} min-h-28 py-3`} value={form.bio}
                                              placeholder="왜 창업했는지, 어떤 여정을 지나왔는지"
                                              onChange={(e) => set({ bio: e.target.value })} />
                                          </div>
                                        </fieldset>

                                        {/* ▍링크 */}
                                        {!setupMode && (
                                          <fieldset className="profile-sec">
                                            <legend className="profile-sec-head"><h3>링크</h3><p>선택 사항이에요. 방문할 곳을 최대 4개까지 연결할 수 있어요.</p></legend>
                                            <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                                              <div className="seed-field">
                                                <label className={label} htmlFor="profile-instagram">인스타그램</label>
                                                <input id="profile-instagram" className={input} value={form.instagram} placeholder="@handle 또는 링크"
                                                  onChange={(e) => set({ instagram: e.target.value })} />
                                              </div>
                                              <div className="seed-field">
                                                <label className={label} htmlFor="profile-x">X (트위터)</label>
                                                <input id="profile-x" className={input} value={form.x} placeholder="@handle 또는 링크"
                                                  onChange={(e) => set({ x: e.target.value })} />
                                              </div>
                                              <div className="seed-field">
                                                <label className={label} htmlFor="profile-linkedin">링크드인</label>
                                                <input id="profile-linkedin" className={input} value={form.linkedin} placeholder="프로필 링크"
                                                  onChange={(e) => set({ linkedin: e.target.value })} />
                                              </div>
                                              <div className="seed-field">
                                                <label className={label} htmlFor="profile-website">개인 사이트</label>
                                                <input id="profile-website" className={input} value={form.website} placeholder="https://"
                                                  onChange={(e) => set({ website: e.target.value })} />
                                              </div>
                                            </div>
                                          </fieldset>
                                        )}

                    <Snackbar
                      open={!!notice}
                      variant={notice?.ok ? "positive" : "critical"}
                      message={notice?.text || ""}
                      onClose={() => setNotice(null)}
                    />

                    <div className="profile-save-bar">
                      <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="button button-small w-full sm:w-auto"
                      >
                        {saving ? "저장 중…" : setupMode ? "저장하고 인터뷰 작성하기 →" : "프로필 저장"}
                      </button>
                    </div>
                  </div>
                    )}
        </div>

        {/* 오른쪽: 항상 보이는 공개 카드 (편집 중에는 실시간 갱신) */}
        <aside className="flex flex-col gap-3 self-start lg:sticky lg:top-6">
          {setupMode && <p className="text-[13px] font-bold text-muted">내 프로필 카드 미리보기</p>}
          <div className="pointer-events-none">
            <TeamProfileCard
              name={form.name || "이름을 입력하세요"}
              title={form.role || "역할을 선택해주세요"}
              headline={form.headline || "한 줄 소개가 여기에 표시됩니다"}
              avatarUrl={form.avatarUrl ?? ""}
              bio={form.bio || "브랜드에서 맡은 역할과 만드는 사람으로서의 이야기를 소개합니다."}
              label={setupMode ? "PROFILE" : "OWNER"}
              founderNumber={initial.founderNumber}
              actionLabel="프로필"
            />
          </div>
          {setupMode && <p className="text-xs leading-relaxed text-muted">저장하면 나만의 공개 프로필 카드로 사용할 수 있습니다.</p>}
        </aside>
      </div>
    </section>
  );
}
