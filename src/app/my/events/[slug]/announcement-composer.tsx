"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEventAnnouncement, type AnnouncementRecipientFilter } from "./announcement-actions";
import { SeedSelect } from "@/components/seed-select";

type RecipientCounts = Record<AnnouncementRecipientFilter, number>;
type AnnouncementHistory = {
  id: string;
  subject: string;
  recipientFilter: AnnouncementRecipientFilter;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  status: "sending" | "sent" | "partial" | "failed";
  createdAt: string;
};

const FILTER_LABELS: Record<AnnouncementRecipientFilter, string> = {
  active: "전체 진행 중 신청자",
  confirmed: "확정 참가자",
  pending: "승인 대기 신청자",
  waitlisted: "대기자",
};

const FILTER_TONES: Record<AnnouncementRecipientFilter, "neutral" | "positive" | "warning" | "informative"> = {
  active: "informative",
  confirmed: "positive",
  pending: "warning",
  waitlisted: "neutral",
};

const input =
  "block w-full h-11 rounded-lg border border-border bg-white px-4 text-[16px] text-fg-strong placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function EventAnnouncementComposer({ eventId, eventSlug, eventName, counts, history }: {
  eventId: string;
  eventSlug: string;
  eventName: string;
  counts: RecipientCounts;
  history: AnnouncementHistory[];
}) {
  const router = useRouter();
  const [recipientFilter, setRecipientFilter] = useState<AnnouncementRecipientFilter>("confirmed");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const recipientCount = counts[recipientFilter];
  const canPreview = subject.trim().length >= 5 && body.trim().length >= 10 && recipientCount > 0 && recipientCount <= 100;
  const bodyLength = useMemo(() => body.length.toLocaleString("ko-KR"), [body.length]);

  const recipientOptions = (Object.keys(FILTER_LABELS) as AnnouncementRecipientFilter[]).map((filter) => ({
    value: filter,
    label: `${FILTER_LABELS[filter]} · ${counts[filter]}명`,
  }));

  function changeDraft(update: () => void) {
    update();
    setPreview(false);
    setMessage(null);
  }

  function send() {
    if (!canPreview || !preview) return;
    startTransition(async () => {
      setMessage(null);
      const result = await sendEventAnnouncement({ eventId, eventSlug, recipientFilter, subject, body });
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      setMessage({
        text: `${result.deliveredCount}명에게 공지를 보냈습니다.${result.failedCount ? ` 실패 ${result.failedCount}건은 발송 기록에서 확인해주세요.` : ""}`,
        error: false,
      });
      setSubject("");
      setBody("");
      setPreview(false);
      router.refresh();
    });
  }

  return <section className="event-announcement-composer">
    <header>
      <div><h2>신청자 공지 메일</h2><p>광고·홍보 메일은 발송할 수 없어요. 행사 일정, 장소, 준비물처럼 신청자가 꼭 알아야 하는 운영 안내만 보내주세요.</p></div>
    </header>
    <div className="event-announcement-layout">
      <div className="event-announcement-form">
        <div className="seed-field">
          <label htmlFor="ann-recipient">수신 대상</label>
          <SeedSelect id="ann-recipient" value={recipientFilter} onChange={(value) => changeDraft(() => setRecipientFilter(value as AnnouncementRecipientFilter))} options={recipientOptions} placeholder="수신 대상을 선택해주세요" />
          <p className="field-helper">{recipientCount > 100 ? "한 번에 최대 100명까지 발송할 수 있어요. 수신 대상을 나눠주세요." : `선택한 대상 ${recipientCount}명에게 발송됩니다.`}</p>
        </div>
        <div className="seed-field">
          <label htmlFor="ann-subject">메일 제목</label>
          <input id="ann-subject" className={input} value={subject} maxLength={80} onChange={(event) => changeDraft(() => setSubject(event.target.value))} placeholder="예: 행사 장소와 입장 시간을 안내드립니다" />
          <p className="field-helper">{subject.length}/80</p>
        </div>
        <div className="seed-field">
          <label htmlFor="ann-body">공지 내용</label>
          <textarea id="ann-body" className={`${input} min-h-28 h-auto resize-y py-3 leading-7`} value={body} maxLength={4000} onChange={(event) => changeDraft(() => setBody(event.target.value))} placeholder={`안녕하세요. ${eventName} 운영팀입니다.\n\n행사 시작 10분 전까지 입장해주세요.`} />
          <p className="field-helper">{bodyLength}/4,000</p>
        </div>
        <p className="event-announcement-note">선택한 대상의 이메일 주소는 화면에 노출하지 않으며, 수신자에게 개별 발송합니다.</p>
        <button type="button" className="button-dark button-small" disabled={!canPreview || pending} onClick={() => setPreview(true)}>발송 내용 확인</button>
      </div>
      <div className="event-announcement-preview" data-ready={preview}>
        <span>메일 미리보기</span>
        {preview ? <>
          <small>[{eventName}]</small>
          <h3>{subject.trim()}</h3>
          <p>{body.trim()}</p>
          <div><strong>{FILTER_LABELS[recipientFilter]}</strong><b>{recipientCount}명</b></div>
          <button type="button" className="button-dark button-small" disabled={pending} onClick={send}>{pending ? "발송 중…" : `${recipientCount}명에게 공지 보내기`}</button>
        </> : <div className="event-announcement-preview-empty"><strong>아직 미리보기가 없어요.</strong><p>수신 대상과 내용을 작성한 뒤 발송 내용을 확인해주세요.</p></div>}
      </div>
    </div>
    {message && <p className="event-announcement-message" data-error={message.error} role="status">{message.text}</p>}
    {history.length > 0 && <div className="event-announcement-history"><header><strong>최근 발송</strong><span>최근 5건</span></header>{history.map((item) => <article key={item.id}><div><strong>{item.subject}</strong><span>{FILTER_LABELS[item.recipientFilter]} · {new Date(item.createdAt).toLocaleString("ko-KR")}</span></div><em data-status={item.status}>{item.status === "sent" ? "발송 완료" : item.status === "partial" ? "일부 실패" : item.status === "sending" ? "발송 중" : "발송 실패"}</em><b>{item.deliveredCount}/{item.recipientCount}명</b></article>)}</div>}
  </section>;
}
