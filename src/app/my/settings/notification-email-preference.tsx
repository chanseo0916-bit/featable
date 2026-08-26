"use client";

import { useState, useTransition } from "react";
import { setNotificationEmail } from "./actions";

export function NotificationEmailPreference({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setNotice(null);
    startTransition(async () => {
      const result = await setNotificationEmail(email);
      setNotice(result.error ?? "앞으로 운영 알림을 이 이메일로 보내드릴게요.");
    });
  }

  return <div className="notification-email-preference">
    <input
      type="email"
      value={email}
      onChange={(event) => setEmail(event.target.value)}
      aria-label="알림 받을 이메일"
      maxLength={254}
      autoComplete="email"
    />
    <button className="button button-small button-secondary" type="button" onClick={save} disabled={pending}>
      {pending ? "저장 중…" : "저장"}
    </button>
    {notice && <small role="status">{notice}</small>}
  </div>;
}
