"use client";

import { useState, useTransition } from "react";
import { updateEventPresentation, type RegistrationField } from "./actions";

export function EventSettingsEditor({ eventId, slug, galleryUrls, registrationFields, isPaid: initialIsPaid, paymentAccount: initialPaymentAccount, paymentNotice: initialPaymentNotice }: { eventId: string; slug: string; galleryUrls: string[]; registrationFields: RegistrationField[]; isPaid: boolean; paymentAccount: string; paymentNotice: string }) {
  const [gallery, setGallery] = useState(galleryUrls);
  const [fields, setFields] = useState(registrationFields);
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [paymentAccount, setPaymentAccount] = useState(initialPaymentAccount);
  const [paymentNotice, setPaymentNotice] = useState(initialPaymentNotice || "입금 확인 후 주최자가 신청을 승인합니다.");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const moveImage = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= gallery.length) return;
    const copy = [...gallery]; [copy[index], copy[next]] = [copy[next], copy[index]]; setGallery(copy);
  };
  const addField = () => setFields((current) => [...current, { id: `field_${Date.now()}`, label: "", type: "text", required: false, placeholder: "" }]);
  const updateField = (id: string, patch: Partial<RegistrationField>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const removeField = (id: string) => setFields((current) => current.filter((field) => field.id !== id));
  const save = () => startTransition(async () => { setMessage(""); const result = await updateEventPresentation({ eventId, slug, galleryUrls: gallery, registrationFields: fields, isPaid, paymentAccount, paymentNotice }); setMessage(result.ok ? "행사 설정을 저장했습니다." : result.error ?? "저장하지 못했습니다."); });

  return <section className="event-settings-editor">
    <header><div><span>EVENT SETTINGS</span><h2>신청 화면 설정</h2><p>참가자에게 보여줄 상세 이미지 순서와 신청 질문을 관리하세요.</p></div><button className="button" type="button" onClick={save} disabled={pending}>{pending ? "저장 중…" : "저장하기"}</button></header>
    <div className="event-settings-block"><div><strong>상세 이미지 순서</strong><small>첫 번째 이미지가 공개 페이지에서 가장 먼저 보여집니다.</small></div>{gallery.length ? <div className="event-settings-gallery">{gallery.map((url, index) => <figure key={url}><img src={url} alt={`상세 이미지 ${index + 1}`} /><figcaption><b>{String(index + 1).padStart(2, "0")}</b><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === gallery.length - 1}>→</button></figcaption></figure>)}</div> : <p className="event-settings-empty">등록된 상세 이미지가 없습니다. 등록 도구에서 이미지를 먼저 추가해주세요.</p>}</div>
    <div className="event-settings-block"><div><strong>참가 신청 폼</strong><small>이름·이메일·개인정보 동의는 기본으로 포함됩니다. 아래 질문을 추가로 받을 수 있어요.</small></div><div className="event-form-fields">{fields.map((field) => <article key={field.id}><div className="event-form-field-head"><input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="질문 제목 (예: 회사명)" /><button type="button" onClick={() => removeField(field.id)}>삭제</button></div><div className="event-form-field-options"><select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as RegistrationField["type"] })}><option value="text">짧은 답변</option><option value="textarea">긴 답변</option><option value="select">선택형</option></select><input value={field.placeholder ?? ""} onChange={(event) => updateField(field.id, { placeholder: event.target.value })} placeholder="입력 안내 문구 (선택)" /><label><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> 필수</label></div>{field.type === "select" && <input className="event-form-field-select-options" value={(field.options ?? []).join(", ")} onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((option) => option.trim()) })} placeholder="선택지: 예비창업자, 창업가, 투자자" />}</article>)}<button className="event-add-field" type="button" onClick={addField} disabled={fields.length >= 8}>＋ 질문 추가 {fields.length >= 8 && "(최대 8개)"}</button></div></div>
    <div className="event-settings-block"><div><strong>참가비·입금 안내</strong><small>유료 행사로 설정하면 승인 방식이 자동으로 ‘주최자 승인 후 확정’으로 바뀝니다.</small></div><label className="event-payment-toggle"><input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} /><span>유료 행사입니다</span></label>{isPaid && <div className="event-payment-fields"><input value={paymentAccount} onChange={(event) => setPaymentAccount(event.target.value)} placeholder="은행명 000-0000-0000 (예금주)" required /><textarea value={paymentNotice} onChange={(event) => setPaymentNotice(event.target.value)} placeholder="입금자명과 입금 기한을 안내해주세요." /></div>}</div>
    {message && <p className="event-settings-message">{message}</p>}
  </section>;
}
