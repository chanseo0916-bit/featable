"use client";

import { useState } from "react";
import { LoginModal } from "@/components/login-modal";
import {
  toggleFounderSupport,
  type FounderSupportState,
} from "@/app/founders/actions";

export function FounderSupportButton({
  founderSlug,
  initialCount = 0,
  initialSupported = false,
}: {
  founderSlug: string;
  initialCount?: number;
  initialSupported?: boolean;
}) {
  const [state, setState] = useState<FounderSupportState>({
    ok: true,
    count: initialCount,
    supported: initialSupported,
  });
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await toggleFounderSupport(founderSlug, !state.supported);
      if (result.loginRequired) {
        setLoginOpen(true);
        return;
      }
      setState(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={state.supported}
        className={`founder-support-button${state.supported ? " is-supported" : ""}`}
      >
        <span>{state.supported ? "응원 취소" : "Founder 응원하기"}</span>
        <strong>{state.count.toLocaleString("ko-KR")}명</strong>
      </button>
      {state.error && <p className="founder-support-error" role="status">{state.error}</p>}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
