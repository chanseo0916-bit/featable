"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { updateEventPresentation, type RegistrationField } from "./actions";
import { formatKstDateTimeInput } from "@/lib/datetime";
import { EventDeleteButton } from "./event-delete-button";
import { SeedSelect } from "@/components/seed-select";

type EventSettingsProps = {
  eventId: string; slug: string; name: string; host: string; description: string;
  startsAt: string; endsAt: string | null; location: string; isOnline: boolean;
  category: string; capacity: number | null; registrationMode: string; applyUrl: string;
  approvalMode: string; coverUrl: string; galleryUrls: string[]; registrationFields: RegistrationField[];
  isPaid: boolean; paymentAccount: string; paymentNotice: string;
  canDelete: boolean;
};

const input =
  "block w-full h-11 rounded-lg border border-border bg-white px-4 text-[15px] text-fg-strong placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft";

const STEPS = [
  { id: 1, label: "행사 정보", hint: "이름과 일시, 장소" },
  { id: 2, label: "신청 & 참가비", hint: "모집 방식, 유료 설정" },
  { id: 3, label: "신청 폼", hint: "참가자 질문 항목" },
  { id: 4, label: "이미지", hint: "포스터, 상세 이미지" },
  { id: 5, label: "저장 & 삭제", hint: "변경사항 반영" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function EventSettingsEditor(props: EventSettingsProps) {
  const { eventId, slug, galleryUrls, registrationFields, isPaid: initialIsPaid, paymentAccount: initialPaymentAccount, paymentNotice: initialPaymentNotice } = props;
  const [step, setStep] = useState<StepId>(1);
  const [name, setName] = useState(props.name);
  const [host, setHost] = useState(props.host);
  const [description, setDescription] = useState(props.description);
  const [startsAt, setStartsAt] = useState(formatKstDateTimeInput(props.startsAt));
  const [endsAt, setEndsAt] = useState(formatKstDateTimeInput(props.endsAt));
  const [location, setLocation] = useState(props.location);
  const [isOnline, setIsOnline] = useState(props.isOnline);
  const [category, setCategory] = useState(props.category);
  const [capacity, setCapacity] = useState(props.capacity?.toString() ?? "");
  const [registrationMode, setRegistrationMode] = useState(props.registrationMode);
  const [applyUrl, setApplyUrl] = useState(props.applyUrl);
  const [approvalMode, setApprovalMode] = useState(props.approvalMode);
  const [coverUrl, setCoverUrl] = useState(props.coverUrl);
  const [gallery, setGallery] = useState(galleryUrls);
  const [fields, setFields] = useState(registrationFields);
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [paymentAccount, setPaymentAccount] = useState(initialPaymentAccount);
  const [paymentNotice, setPaymentNotice] = useState(initialPaymentNotice || "입금 확인 후 주최자가 신청을 승인합니다.");
  const [message, setMessage] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [pending, startTransition] = useTransition();
  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "event-cover");
      const response = await fetch("/api/upload", { method: "POST", body });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "대표 포스터를 업로드하지 못했습니다.");
      setCoverUrl(result.url);
      setMessage("새 대표 포스터를 올렸습니다. 저장을 눌러 반영해주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "대표 포스터를 업로드하지 못했습니다.");
    } finally {
      setUploadingCover(false);
    }
  };
  const moveImage = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= gallery.length) return;
    const copy = [...gallery]; [copy[index], copy[next]] = [copy[next], copy[index]]; setGallery(copy);
  };
  const addField = () => setFields((current) => [...current, { id: `field_${Date.now()}`, label: "", type: "text", required: false, placeholder: "" }]);
  const updateField = (id: string, patch: Partial<RegistrationField>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const removeField = (id: string) => setFields((current) => current.filter((field) => field.id !== id));
  const save = () => startTransition(async () => { setMessage(""); const result = await updateEventPresentation({ eventId, slug, name, host, description, startsAt, endsAt, location, isOnline, category, capacity, registrationMode, applyUrl, approvalMode, coverUrl, galleryUrls: gallery, registrationFields: fields, isPaid, paymentAccount, paymentNotice }); setMessage(result.ok ? "행사 정보와 운영 설정을 저장했습니다." : result.error ?? "저장하지 못했습니다."); });

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return <div className="event-settings-wizard">
    <aside className="event-wizard-nav" aria-label="설정 단계">
      <ol>
        {STEPS.map((s) => {
          const status: "done" | "current" | "todo" = step > s.id ? "done" : step === s.id ? "current" : "todo";
          return <li key={s.id} className={`event-wizard-nav-item event-wizard-nav-${status}`}>
            <button type="button" onClick={() => setStep(s.id)} aria-current={step === s.id ? "step" : undefined}>
              <span className="event-wizard-nav-bullet">{status === "done" ? "✓" : s.id}</span>
              <span className="event-wizard-nav-text"><b>{s.label}</b><i>{s.hint}</i></span>
            </button>
          </li>;
        })}
      </ol>
    </aside>

    <section className="event-wizard-content">
      <header className="event-wizard-content-head">
        <div><h2>{STEPS[currentIndex].label}</h2><p>{STEPS[currentIndex].hint}</p></div>
        <button className="button" type="button" onClick={save} disabled={pending || uploadingCover}>{pending ? "저장 중…" : "변경사항 저장"}</button>
      </header>

      {step === 1 && <div className="event-settings-block">
        <div className="event-fields">
          <div className="seed-field event-field-half"><label>행사명</label><input className={input} value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 브랜드 런칭 데이" /></div>
          <div className="seed-field event-field-half"><label>주최자·기관</label><input className={input} value={host} onChange={(event) => setHost(event.target.value)} placeholder="예: Featable, OO 스튜디오" /></div>
          <div className="seed-field event-field-half"><label>카테고리</label><input className={input} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="예: 패션, 푸드, SaaS" /></div>
          <div className="seed-field event-field-half"><label>정원</label><input className={input} type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="비워두면 제한 없음" /></div>
          <div className="seed-field event-field-half"><label>시작 일시</label><input className={input} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div>
          <div className="seed-field event-field-half"><label>종료 일시</label><input className={input} type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div>
          <div className="seed-field event-field-half"><label>{isOnline ? "온라인 참여 안내" : "행사 장소"}</label><input className={input} value={location} onChange={(event) => setLocation(event.target.value)} placeholder={isOnline ? "Zoom 링크, 접속 안내 등" : "서울 성동구 OO빌딩 3층"} /></div>
          <div className="seed-field event-field-half"><label className="event-field-checkbox"><input type="checkbox" checked={isOnline} onChange={(event) => setIsOnline(event.target.checked)} /> 온라인 행사</label></div>
          <div className="seed-field event-field-full"><label>행사 소개</label><textarea className={`${input} min-h-32 h-auto py-3 leading-7 resize-y`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="이런 분에게 추천해요, 무엇을 가져갈 수 있는지 알려주세요." /></div>
        </div>
      </div>}

      {step === 2 && <div className="event-settings-block">
        <div className="event-fields">
          <div className="seed-field event-field-half"><label>신청 받기</label><SeedSelect value={registrationMode} onChange={setRegistrationMode} options={[{ value: "internal", label: "Featable에서 신청" }, { value: "external", label: "외부 링크로 신청" }, { value: "closed", label: "신청 마감" }]} /></div>
          {registrationMode === "internal" && <div className="seed-field event-field-half"><label>승인 방식</label><SeedSelect value={approvalMode} onChange={setApprovalMode} options={[{ value: "instant", label: "즉시 확정" }, { value: "manual", label: "주최자 승인" }]} disabled={isPaid} /></div>}
          {registrationMode === "external" && <div className="seed-field event-field-half"><label>신청 링크</label><input className={input} value={applyUrl} onChange={(event) => setApplyUrl(event.target.value)} placeholder="https://" /></div>}
        </div>
        <div className="event-fields" style={{ marginTop: 20 }}>
          <label className="event-field-checkbox event-field-full"><input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} /> 유료 행사</label>
          {isPaid && <p className="event-payment-note">유료로 설정하면 승인 방식은 자동으로 ‘주최자 승인 후 확정’으로 바뀌어요.</p>}
          {isPaid && <>
            <div className="seed-field event-field-half"><label>입금 계좌</label><input className={input} value={paymentAccount} onChange={(event) => setPaymentAccount(event.target.value)} placeholder="은행명 000-0000-0000 (예금주)" required /></div>
            <div className="seed-field event-field-full"><label>입금 안내</label><textarea className={`${input} min-h-24 h-auto py-3 resize-y`} value={paymentNotice} onChange={(event) => setPaymentNotice(event.target.value)} placeholder="입금자명과 입금 기한을 안내해주세요." /></div>
          </>}
        </div>
      </div>}

      {step === 3 && <div className="event-settings-block">
        <div className="event-form-fields">{fields.map((field) => <article key={field.id}><div className="event-form-field-head"><input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="질문 제목 (예: 회사명)" /><button type="button" onClick={() => removeField(field.id)}>삭제</button></div><div className="event-form-field-options"><select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as RegistrationField["type"] })}><option value="text">짧은 답변</option><option value="textarea">긴 답변</option><option value="select">선택형</option></select><input value={field.placeholder ?? ""} onChange={(event) => updateField(field.id, { placeholder: event.target.value })} placeholder="입력 안내 문구 (선택)" /><label><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> 필수</label></div>{field.type === "select" && <input className="event-form-field-select-options" value={(field.options ?? []).join(", ")} onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((option) => option.trim()) })} placeholder="선택지: 예비창업자, 창업가, 투자자" />}</article>)}<button className="event-add-field" type="button" onClick={addField} disabled={fields.length >= 8}>＋ 질문 추가 {fields.length >= 8 && "(최대 8개)"}</button></div>
        <p className="event-wizard-note">이름·이메일·개인정보 동의는 기본으로 포함됩니다. 질문 항목만 추가하면 돼요.</p>
      </div>}

      {step === 4 && <div className="event-settings-block">
        <div className="event-settings-block-head"><h3>대표 포스터</h3><p>행사 목록과 공개 페이지의 메인 표지로 사용돼요.</p></div>
        <label className="event-image-upload">{coverUrl ? <img src={coverUrl} alt="대표 포스터 미리보기" /> : <b>포스터 이미지 선택</b>}<small>{uploadingCover ? "업로드 중…" : "JPG, PNG, WEBP · 최대 15MB · 클릭해서 교체"}</small><input type="file" accept="image/*" disabled={pending || uploadingCover} onChange={uploadCover} /></label>
        <div className="event-settings-block-head" style={{ marginTop: 28 }}><h3>상세 이미지 순서</h3><p>첫 번째 이미지가 공개 페이지에서 가장 먼저 보여요.</p></div>
        {gallery.length ? <div className="event-settings-gallery">{gallery.map((url, index) => <figure key={url}><img src={url} alt={`상세 이미지 ${index + 1}`} /><figcaption><b>{String(index + 1).padStart(2, "0")}</b><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>←</button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === gallery.length - 1}>→</button></figcaption></figure>)}</div> : <p className="event-settings-empty">등록된 상세 이미지가 없습니다. 등록 도구에서 이미지를 먼저 추가해주세요.</p>}
      </div>}

      {step === 5 && <div className="event-settings-block">
        <div className="event-wizard-final">
          <div className="event-wizard-final-row"><span>행사명</span><b>{name || "입력 전"}</b></div>
          <div className="event-wizard-final-row"><span>일시</span><b>{startsAt ? formatKstDateTimeInput(startsAt) : "미정"} — {endsAt ? formatKstDateTimeInput(endsAt) : "미정"}</b></div>
          <div className="event-wizard-final-row"><span>장소</span><b>{isOnline ? "온라인" : (location || "미정")}</b></div>
          <div className="event-wizard-final-row"><span>신청</span><b>{registrationMode === "internal" ? "Featable에서 신청" : registrationMode === "external" ? "외부 링크" : "신청 마감"}</b></div>
          <div className="event-wizard-final-row"><span>참가비</span><b>{isPaid ? "유료" : "무료"}</b></div>
          <div className="event-wizard-final-row"><span>신청 폼</span><b>{fields.length}개 질문</b></div>
          <div className="event-wizard-final-row"><span>이미지</span><b>포스터 {gallery.length}장</b></div>
        </div>
        <button className="button" type="button" onClick={save} disabled={pending || uploadingCover} style={{ width: "100%" }}>{pending ? "저장 중…" : "변경사항 저장"}</button>
        {props.canDelete && <div style={{ marginTop: 24 }}><EventDeleteButton eventId={eventId} slug={slug} name={name} /></div>}
      </div>}

      {message && <p className="event-settings-message">{message}</p>}

      <div className="event-wizard-footer">
        <button type="button" className="button-soft" onClick={() => setStep((s) => Math.max(1, s - 1) as StepId)} disabled={step === 1}>이전</button>
        <button type="button" className="button" onClick={() => setStep((s) => Math.min(STEPS.length, s + 1) as StepId)} disabled={step === STEPS.length}>다음</button>
      </div>
    </section>
  </div>;
}
