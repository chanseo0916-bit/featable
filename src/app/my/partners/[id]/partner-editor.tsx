"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { PartnerPublishingPreview, PublishingDetailPreview } from "@/components/publishing-preview-cards";
import { updateOwnedPartner, type PartnerEditInput } from "./actions";

export function PartnerEditor({ id, initial }: { id: string; initial: PartnerEditInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<"card" | "detail">("card");
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<PartnerEditInput>) => { setSaved(false); setForm((current) => ({ ...current, ...patch })); };

  async function uploadLogo(file: File) {
    setUploading(true); setMessage("");
    try {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("5MB 이하 이미지 파일을 선택해주세요.");
      const body = new FormData(); body.append("file", file); body.append("kind", "partner-logo");
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "업로드에 실패했습니다.");
      set({ logoUrl: payload.url });
    } catch (error) { setMessage(error instanceof Error ? error.message : "로고 업로드에 실패했습니다."); }
    finally { setUploading(false); }
  }
  function dropLogo(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) void uploadLogo(file); }
  function save() { setMessage(""); startTransition(async () => { const result = await updateOwnedPartner(id, form); if (!result.ok) return setMessage(result.error); setSaved(true); setMessage("파트너 프로필을 저장했습니다."); router.refresh(); }); }
  const preview = { ...form, instagram: "" };

  return <div className="approved-publishing-layout"><section className="approved-publishing-form">
    <header><div className="approved-status-bar"><i>✓</i><div><span>VERIFIED PARTNER</span><strong>승인된 파트너 프로필을 관리하고 있어요</strong></div><small>{form.status === "published" ? "공개 중" : "숨김"}</small></div><h1>파트너 프로필 수정</h1><p>저장하면 파트너 디렉터리 카드에 바로 반영됩니다.</p></header>
    <div className="approved-form-fields">
      <label className="approved-logo-field" onDragOver={(event) => event.preventDefault()} onDrop={dropLogo}><span>로고 *</span><div>{form.logoUrl ? <img src={form.logoUrl} alt="로고 미리보기" /> : <b>{form.name.slice(0, 1) || "+"}</b>}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} /><div><strong>{uploading ? "업로드 중…" : "로고 변경"}</strong><small>클릭하거나 파일을 끌어놓으세요 · 최대 5MB</small></div></div></label>
      <label><span>파트너명 *</span><input value={form.name} onChange={(event) => set({ name: event.target.value })} /></label>
      <label><span>분야 *</span><input value={form.field} onChange={(event) => set({ field: event.target.value })} /></label>
      <label className="wide"><span>한 줄 소개 *</span><input maxLength={180} value={form.intro} onChange={(event) => set({ intro: event.target.value })} /></label>
      <label className="wide"><span>상세 소개</span><textarea value={form.description} onChange={(event) => set({ description: event.target.value })} /></label>
      <label><span>연결 웹사이트 *</span><input type="url" value={form.website} onChange={(event) => set({ website: event.target.value })} placeholder="https://" /></label>
      <label><span>노출 상태</span><select value={form.status} onChange={(event) => set({ status: event.target.value as "published" | "hidden" })}><option value="published">파트너 페이지에 공개</option><option value="hidden">잠시 숨기기</option></select></label>
    </div>
    {message && <p className="approved-publishing-message" data-success={saved || undefined}>{message}</p>}
    <footer><span><i data-state={saved ? "saved" : "idle"} />{pending ? "저장 중" : saved ? "저장됨" : "변경사항을 확인해주세요"}<small>Featured 지정은 Featable 관리자가 운영합니다.</small></span><button type="button" className="secondary" onClick={() => router.push("/partners")}>파트너 페이지</button><button type="button" disabled={pending || uploading} onClick={save}>{pending ? "저장 중…" : "변경사항 저장"}</button></footer>
  </section><aside className="approved-publishing-preview"><header><div><span>LIVE PREVIEW</span><strong>{previewMode === "card" ? "파트너 카드" : "상세 화면"}</strong></div><div className="publishing-preview-tabs"><button className={previewMode === "card" ? "active" : ""} onClick={() => setPreviewMode("card")}>목록 카드</button><button className={previewMode === "detail" ? "active" : ""} onClick={() => setPreviewMode("detail")}>상세 화면</button></div></header>{previewMode === "card" ? <PartnerPublishingPreview value={preview} /> : <PublishingDetailPreview value={preview} type="partner" />}</aside></div>;
}
