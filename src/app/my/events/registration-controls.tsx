"use client";

import { useState, useTransition } from "react";
import { reviewEventRegistration } from "./actions";

export function RegistrationControls({ registrationId, eventSlug }: { registrationId: string; eventSlug: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function review(decision: "confirm" | "reject") {
    setError("");
    startTransition(async () => {
      const result = await reviewEventRegistration(registrationId, eventSlug, decision);
      if (!result.ok) setError(result.error ?? "신청 상태를 변경하지 못했습니다.");
    });
  }
  return <div className="event-registration-controls"><button type="button" disabled={pending} onClick={() => review("confirm")}>승인</button><button type="button" disabled={pending} onClick={() => review("reject")}>거절</button>{error && <small role="alert">{error}</small>}</div>;
}
