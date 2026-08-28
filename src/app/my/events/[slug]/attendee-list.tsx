"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { RegistrationControls } from "../registration-controls";

interface RegistrationRow {
  id: string;
  status: "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled";
  applicant_name: string;
  applicant_email: string;
  note: string | null;
  applied_at: string;
}

const statusLabel: Record<RegistrationRow["status"], string> = {
  pending: "승인 대기",
  confirmed: "승인",
  waitlisted: "대기",
  rejected: "거절",
  cancelled: "취소",
};

const REG_TONE: Record<RegistrationRow["status"], "warning" | "positive" | "informative" | "critical" | "neutral"> = {
  pending: "warning",
  confirmed: "positive",
  waitlisted: "informative",
  rejected: "critical",
  cancelled: "neutral",
};

const shortDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} · ${date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
};

function splitNote(note: string | null) {
  if (!note) return { message: "", answers: [] as { label: string; value: string }[] };
  const marker = "추가 질문";
  const idx = note.indexOf(marker);
  if (idx === -1) return { message: note.trim(), answers: [] };
  const message = note.slice(0, idx).replace(/[\s\n]+$/, "");
  const after = note.slice(idx + marker.length).replace(/^\s*\n+/, "");
  const answers = after
    .split("\n")
    .map((line) => {
      const sep = line.indexOf(": ");
      if (sep < 1) return null;
      return { label: line.slice(0, sep).trim(), value: line.slice(sep + 2).trim() };
    })
    .filter((a): a is { label: string; value: string } => !!a && !!a.value);
  return { message, answers };
}

export function EventAttendeeList({ registrations, eventSlug }: { registrations: RegistrationRow[]; eventSlug: string }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      q
        ? registrations.filter((row) => row.applicant_name.toLowerCase().includes(q) || row.applicant_email.toLowerCase().includes(q))
        : registrations,
    [registrations, q],
  );

  return (
    <>
      <div className="event-attendee-toolbar">
        <label className="event-attendee-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름과 이메일로 신청자를 찾아보세요." aria-label="신청자 검색" />
        </label>
        <span className="event-attendee-count">{filtered.length}명</span>
      </div>

      {filtered.length ? (
        <ul className="event-attendee-list">
          <li className="event-attendee-list-head" aria-hidden="true">
            <span>이름</span><span>이메일</span><span>신청일</span><span>상태</span><span></span>
          </li>
          {filtered.map((item, index) => {
            const { message, answers } = splitNote(item.note);
            const hasNote = Boolean(message) || answers.length > 0;
            return (
              <li className="event-attendee-row" key={item.id}>
                <div className="event-attendee-row-main">
                  <i className="event-attendee-index">{String(index + 1).padStart(2, "0")}</i>
                  <div className="event-attendee-identity">
                    <strong>{item.applicant_name}</strong>
                  </div>
                  <a className="event-attendee-email" href={`mailto:${item.applicant_email}`}>{item.applicant_email}</a>
                  <time className="event-attendee-date">{shortDate(item.applied_at)}</time>
                  <Badge tone={REG_TONE[item.status]}>{statusLabel[item.status]}</Badge>
                  <div className="event-attendee-row-actions">
                    {(item.status === "pending" || item.status === "waitlisted") && <RegistrationControls registrationId={item.id} eventSlug={eventSlug} />}
                  </div>
                </div>
                {hasNote && (
                  <div className="event-attendee-row-note">
                    {message && <p className="event-attendee-message">{message}</p>}
                    {answers.length > 0 && (
                      <div className="event-attendee-answers">
                        {answers.map((answer) => (
                          <span key={answer.label} className="event-attendee-answer"><b>{answer.label}</b>{answer.value}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="my-event-empty"><strong>검색 결과가 없어요.</strong><span>다른 이름이나 이메일로 검색해보세요.</span></div>
      )}
    </>
  );
}