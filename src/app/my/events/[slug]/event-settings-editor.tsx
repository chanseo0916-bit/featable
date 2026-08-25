"use client";

import { useState, useTransition } from "react";
import { updateEventPresentation, type RegistrationField } from "./actions";

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

type EventSettingsProps = {
  eventId: string; slug: string; name: string; host: string; description: string;
  startsAt: string; endsAt: string | null; location: string; isOnline: boolean;
  category: string; capacity: number | null; registrationMode: string; applyUrl: string;
  approvalMode: string; galleryUrls: string[]; registrationFields: RegistrationField[];
  isPaid: boolean; paymentAccount: string; paymentNotice: string;
};

export function EventSettingsEditor(props: EventSettingsProps) {
  const { eventId, slug, galleryUrls, registrationFields, isPaid: initialIsPaid, paymentAccount: initialPaymentAccount, paymentNotice: initialPaymentNotice } = props;
  const [name, setName] = useState(props.name);
  const [host, setHost] = useState(props.host);
  const [description, setDescription] = useState(props.description);
  const [startsAt, setStartsAt] = useState(localDateTime(props.startsAt));
  const [endsAt, setEndsAt] = useState(localDateTime(props.endsAt));
  const [location, setLocation] = useState(props.location);
  const [isOnline, setIsOnline] = useState(props.isOnline);
  const [category, setCategory] = useState(props.category);
  const [capacity, setCapacity] = useState(props.capacity?.toString() ?? "");
  const [registrationMode, setRegistrationMode] = useState(props.registrationMode);
  const [applyUrl, setApplyUrl] = useState(props.applyUrl);
  const [approvalMode, setApprovalMode] = useState(props.approvalMode);
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
  const save = () => startTransition(async () => { setMessage(""); const result = await updateEventPresentation({ eventId, slug, name, host, description, startsAt, endsAt, location, isOnline, category, capacity, registrationMode, applyUrl, approvalMode, galleryUrls: gallery, registrationFields: fields, isPaid, paymentAccount, paymentNotice }); setMessage(result.ok ? "행사 정보와 운영 설정을 저장했습니다." : result.error ?? "저장하지 못했습니다."); });

  return <section className="event-settings-editor">
    <header><div><span>EVENT OPERATIONS</span><h2>행사 정보와 신청 설정</h2><p>공동 주최자도 공개 정보, 신청 폼과 참가비 설정을 함께 수정할 수 있어요.</p></div><button className="button" type="button" onClick={save} disabled={pending}>{pending ? "저장 중…" : "변경사항 저장"}</button></header>
    <div className="event-settings-block"><div><strong>행사 기본 정보</strong><small>공개 페이지에 바로 반영되는 정보입니다.</small></div><div className="event-payment-fields"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="행사명" /><input value={host} onChange={(event) => setHost(event.target.value)} placeholder="주최자·기관명" /><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="행사 소개" /><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /><label className="event-payment-toggle"><input type="checkbox" checked={isOnline} onChange={(event) => setIsOnline(event.target.checked)} /><span>온라인 행사입니다</span></label><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={isOnline ? "온라인 참여 안내" : "행사 장소"} /><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="카테고리" /><input type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="정원 (비워두면 제한 없음)" /><select value={registrationMode} onChange={(event) => setRegistrationMode(event.target.value)}><option value="internal">Featable에서 신청</option><option value="external">외부 링크로 신청</option><option value="closed">신청 마감</option></select>{registrationMode === "external" && <input value={applyUrl} onChange={(event) => setApplyUrl(event.target.value)} placeholder="https:// 신청 링크" />}{registrationMode === "internal" && <select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value)} disabled={isPaid}><option value="instant">즉시 확정</option><option value="manual">주최자 승인</option></select>}</div></div>
    <div className="event-settings-block"><div><strong>상세 이미지 순서</strong><small>첫 번째 이미지가 공개 페이지에서 가장 먼저 보여집니다.</small></div>{gallery.length ? <div className="event-settings-gallery">{gallery.map((url, index) => <figure key={url}><img src={url} alt={`상세 이미지 ${index + 1}`} /><figcaption><b>{String(index + 1).padStart(2, "0")}</b><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === gallery.length - 1}>→</button></figcaption></figure>)}</div> : <p className="event-settings-empty">등록된 상세 이미지가 없습니다. 등록 도구에서 이미지를 먼저 추가해주세요.</p>}</div>
    <div className="event-settings-block"><div><strong>참가 신청 폼</strong><small>이름·이메일·개인정보 동의는 기본으로 포함됩니다. 아래 질문을 추가로 받을 수 있어요.</small></div><div className="event-form-fields">{fields.map((field) => <article key={field.id}><div className="event-form-field-head"><input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="질문 제목 (예: 회사명)" /><button type="button" onClick={() => removeField(field.id)}>삭제</button></div><div className="event-form-field-options"><select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as RegistrationField["type"] })}><option value="text">짧은 답변</option><option value="textarea">긴 답변</option><option value="select">선택형</option></select><input value={field.placeholder ?? ""} onChange={(event) => updateField(field.id, { placeholder: event.target.value })} placeholder="입력 안내 문구 (선택)" /><label><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> 필수</label></div>{field.type === "select" && <input className="event-form-field-select-options" value={(field.options ?? []).join(", ")} onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((option) => option.trim()) })} placeholder="선택지: 예비창업자, 창업가, 투자자" />}</article>)}<button className="event-add-field" type="button" onClick={addField} disabled={fields.length >= 8}>＋ 질문 추가 {fields.length >= 8 && "(최대 8개)"}</button></div></div>
    <div className="event-settings-block"><div><strong>참가비·입금 안내</strong><small>유료 행사로 설정하면 승인 방식이 자동으로 ‘주최자 승인 후 확정’으로 바뀝니다.</small></div><label className="event-payment-toggle"><input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} /><span>유료 행사입니다</span></label>{isPaid && <div className="event-payment-fields"><input value={paymentAccount} onChange={(event) => setPaymentAccount(event.target.value)} placeholder="은행명 000-0000-0000 (예금주)" required /><textarea value={paymentNotice} onChange={(event) => setPaymentNotice(event.target.value)} placeholder="입금자명과 입금 기한을 안내해주세요." /></div>}</div>
    {message && <p className="event-settings-message">{message}</p>}
  </section>;
}
