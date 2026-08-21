"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CommunityPublishingPreview, PartnerPublishingPreview, PublishingDetailPreview } from "@/components/publishing-preview-cards";
import { publishApprovedProfile, savePublishingProfile, type PublishingProfileInput } from "./actions";

export function PublishingEditor({ token, type, initial }: { token: string; type: "partner" | "community"; initial: PublishingProfileInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
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

  function dropLogo(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadLogo(file);
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
      <header><div className="approved-status-bar"><i>✓</i><div><span>REGISTRATION APPROVED</span><strong>{type === "partner" ? "파트너 등록 권한이 열렸어요" : "커뮤니티 등록 권한이 열렸어요"}</strong></div><small>승인 완료</small></div><h1>{type === "partner" ? "파트너 프로필 완성하기" : "커뮤니티 페이지 완성하기"}</h1><p>필수 정보만 채우면 바로 공개할 수 있어요.</p></header>
      <div className="approved-form-fields">
        <label className="approved-logo-field" onDragOver={(event) => event.preventDefault()} onDrop={dropLogo}><span>로고 *</span><div>{form.logoUrl ? <img src={form.logoUrl} alt="로고 미리보기" /> : <b>{form.name.slice(0, 1) || "+"}</b>}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} /><div><strong>{uploading ? "업로드 중…" : form.logoUrl ? "다른 이미지로 변경" : "로고 이미지 올리기"}</strong><small>클릭하거나 파일을 끌어놓으세요 · 최대 5MB</small></div></div></label>
        <label><span>{type === "partner" ? "파트너명" : "커뮤니티명"} *</span><input value={form.name} onChange={(event) => set({ name: event.target.value })} /></label>
        <label><span>분야 *</span><input value={form.field} onChange={(event) => set({ field: event.target.value })} placeholder="예: 스타트업, 마케팅, SaaS" /></label>
        <label className="wide"><span>한 줄 소개 *</span><input value={form.intro} maxLength={180} onChange={(event) => set({ intro: event.target.value })} placeholder="누구를 위해 무엇을 하는지 한 문장으로" /></label>
        <label className="wide"><span>상세 소개</span><textarea value={form.description} onChange={(event) => set({ description: event.target.value })} placeholder="활동, 제공하는 가치, 함께하고 싶은 대상을 소개해주세요." /></label>
        <label><span>웹사이트</span><input type="url" value={form.website} onChange={(event) => set({ website: event.target.value })} placeholder="https://" /></label>
        {type === "community" && <label><span>인스타그램</span><input value={form.instagram} onChange={(event) => set({ instagram: event.target.value })} placeholder="@account" /></label>}
      </div>
      {message && <p className="approved-publishing-message">{message}</p>}
      <footer><span><i data-state={saveState} />{saveState === "saving" ? "저장 중" : saveState === "saved" ? "자동 저장됨" : "변경사항 확인 중"}<small>공개 후에도 수정할 수 있어요.</small></span><button type="button" className="secondary" onClick={() => void save(true)} disabled={saveState === "saving"}>임시저장</button><button type="button" onClick={publish} disabled={publishing || uploading}>{publishing ? "공개 중…" : "공개하기 →"}</button></footer>
    </section>
    <aside className="approved-publishing-preview"><header><div><span>LIVE PREVIEW</span><strong>{previewMode === "card" ? "실제 공개 카드" : "상세 화면"}</strong></div><div className="publishing-preview-tabs"><button className={previewMode === "card" ? "active" : ""} type="button" onClick={() => setPreviewMode("card")}>목록 카드</button><button className={previewMode === "detail" ? "active" : ""} type="button" onClick={() => setPreviewMode("detail")}>상세 화면</button></div></header>{previewMode === "card" ? type === "partner" ? <PartnerPublishingPreview value={form} /> : <CommunityPublishingPreview value={form} /> : <PublishingDetailPreview value={form} type={type} />}</aside>
  </div>;
}
