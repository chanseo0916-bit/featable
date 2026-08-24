"use client";

import { useState, useTransition } from "react";
import { setMarketingEmailPreference } from "./actions";

export function MarketingPreference({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function change(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setNotice(null);
    startTransition(async () => {
      const result = await setMarketingEmailPreference(next);
      if (result.error) { setEnabled(previous); setNotice(result.error); return; }
      setNotice(next ? "새 인터뷰와 주요 소식을 이메일로 보내드릴게요." : "마케팅 이메일 수신을 해제했습니다.");
    });
  }

  return <div className="marketing-preference"><button type="button" role="switch" aria-checked={enabled} className={enabled ? "active" : undefined} disabled={pending} onClick={() => change(!enabled)}><i /><span>{enabled ? "수신 중" : "수신 안 함"}</span></button>{notice && <small>{notice}</small>}</div>;
}
