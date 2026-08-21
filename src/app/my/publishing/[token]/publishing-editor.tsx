"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CommunityPublishingPreview, PartnerPublishingPreview } from "@/components/publishing-preview-cards";
import { publishApprovedProfile, savePublishingProfile, type PublishingProfileInput } from "./actions";

export function PublishingEditor({ token, type, initial }: { token: string; type: "partner" | "community"; initial: PublishingProfileInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [uploading, setUploading] = useState(false);
  const [publishing, startPublishing] = useTransition();
  const mounted = useRef(false);
  const set = (patch: Partial<PublishingProfileInput>) => setForm((current) => ({ ...current, ...patch }));

  async function save(showMessage = false) {
    setSaveState("saving");
    const result = await savePublishingProfile(token, form);
    if (!result.ok) { setSaveState("idle"); setMessage(result.error); return; }
    setSaveState("saved");
    if (showMessage) setMessage("임시저장했습니다.");
  }

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setSaveState("idle");
    const timer = window.setTimeout(() => void save(false), 1400);
    return () => window.clearTimeout(timer);
    // form changes are intentionally debounced into one server mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  async function uploadLogo(file: File) {
    setUploading(true); setMessage("");
    try {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("5MB 이하 이미지 파일을 선택해주세요.");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");
      const extension = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}-publishing.${extension}`;
      const { error } = await supabase.storage.from("images").upload(path, file);
      if (error) throw error;
      set({ logoUrl: supabase.storage.from("images").getPublicUrl(path).data.publicUrl });
    } catch (error) { setMessage(error instanceof Error ? error.message : "로고 업로드에 실패했습니다."); }
    finally { setUploading(false); }
  }

  function publish() {
    setMessage("");
    startPublishing(async () => {
      const result = await publishApprovedProfile(token, form);
      if (!result.ok) { setMessage(result.error); return; }
      router.push(result.path || (type === "partner" ? "/partners" : "/communities"));
      router.refresh();
    });
  }

  return <div className="approved-publishing-layout">
    <section className="approved-publishing-form">
      <header><span>{type === "partner" ? "APPROVED PARTNER" : "APPROVED COMMUNITY"}</span><h1>{type === "partner" ? "파트너 프로필 완성하기" : "커뮤니티 페이지 완성하기"}</h1><p>승인된 등록입니다. 입력한 내용은 오른쪽 공개 카드에 실시간으로 반영돼요.</p></header>
      <div className="approved-form-fields">
        <label className="approved-logo-field"><span>로고 *</span><div>{form.logoUrl ? <img src={form.logoUrl} alt="로고 미리보기" /> : <b>{form.name.slice(0, 1) || "+"}</b>}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} /><small>{uploading ? "업로드 중…" : "이미지 변경"}</small></div></label>
        <label><span>{type === "partner" ? "파트너명" : "커뮤니티명"} *</span><input value={form.name} onChange={(event) => set({ name: event.target.value })} /></label>
        <label><span>분야 *</span><input value={form.field} onChange={(event) => set({ field: event.target.value })} placeholder="예: 스타트업, 마케팅, SaaS" /></label>
        <label className="wide"><span>한 줄 소개 *</span><input value={form.intro} maxLength={180} onChange={(event) => set({ intro: event.target.value })} placeholder="누구를 위해 무엇을 하는지 한 문장으로" /></label>
        <label className="wide"><span>상세 소개</span><textarea value={form.description} onChange={(event) => set({ description: event.target.value })} placeholder="활동, 제공하는 가치, 함께하고 싶은 대상을 소개해주세요." /></label>
        <label><span>웹사이트</span><input type="url" value={form.website} onChange={(event) => set({ website: event.target.value })} placeholder="https://" /></label>
        {type === "community" && <label><span>인스타그램</span><input value={form.instagram} onChange={(event) => set({ instagram: event.target.value })} placeholder="@account" /></label>}
      </div>
      {message && <p className="approved-publishing-message">{message}</p>}
      <footer><span><i data-state={saveState} />{saveState === "saving" ? "저장 중" : saveState === "saved" ? "자동 저장됨" : "변경사항 확인 중"}</span><button type="button" className="secondary" onClick={() => void save(true)} disabled={saveState === "saving"}>임시저장</button><button type="button" onClick={publish} disabled={publishing || uploading}>{publishing ? "공개 중…" : "공개하기 →"}</button></footer>
    </section>
    <aside className="approved-publishing-preview"><header><span>LIVE PREVIEW</span><strong>실제 공개 카드</strong><p>공개 목록에서 보이는 모습을 그대로 확인하세요.</p></header>{type === "partner" ? <PartnerPublishingPreview value={form} /> : <CommunityPublishingPreview value={form} />}</aside>
  </div>;
}
