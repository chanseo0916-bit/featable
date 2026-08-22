"use client";

import { useState } from "react";
import { updateFounderNumber } from "../actions";

export function FounderNumberEditor({ userId, initialValue }: { userId: string; initialValue: number | null }) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await updateFounderNumber(userId, value);
    setSaving(false);
    setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "저장했습니다." });
  }

  return <div className="admin-founder-number-editor">
    <div><input aria-label="Founder 고유 번호" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, ""))} placeholder="예: 1008" /><button type="button" className="admin-action-button" onClick={save} disabled={saving}>{saving ? "저장 중" : "번호 저장"}</button></div>
    <small>비우고 저장하면 번호를 해제합니다.</small>
    {message && <span className={message.ok ? "success" : "error"}>{message.text}</span>}
  </div>;
}
