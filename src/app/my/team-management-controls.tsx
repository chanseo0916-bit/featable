"use client";

import { useState, useTransition } from "react";
import {
  cancelBrandInvitation,
  moveBrandMember,
  removeBrandMember,
  updateBrandMemberRole,
  type BrandMemberRole,
} from "./team-actions";

export function TeamMemberControls({
  brandId,
  userId,
  name,
  role,
  first,
  last,
}: {
  brandId: string;
  userId: string;
  name: string;
  role: BrandMemberRole;
  first: boolean;
  last: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  return <div className="team-member-admin">
    <div className="team-member-role-pills" aria-label={`${name} 권한`}>
      <button type="button" disabled={pending} className={role === "editor" ? "active" : ""} onClick={() => run(() => updateBrandMemberRole(brandId, userId, "editor"))}>편집</button>
      <button type="button" disabled={pending} className={role === "viewer" ? "active" : ""} onClick={() => run(() => updateBrandMemberRole(brandId, userId, "viewer"))}>보기</button>
    </div>
    <div className="team-member-order">
      <button type="button" disabled={pending || first} aria-label="앞으로 이동" onClick={() => run(() => moveBrandMember(brandId, userId, "up"))}>←</button>
      <button type="button" disabled={pending || last} aria-label="뒤로 이동" onClick={() => run(() => moveBrandMember(brandId, userId, "down"))}>→</button>
    </div>
    <button type="button" className="remove" disabled={pending} onClick={() => {
      if (window.confirm(`${name}님을 팀에서 내보낼까요?`)) run(() => removeBrandMember(brandId, userId));
    }}>내보내기</button>
    {error && <small>{error}</small>}
  </div>;
}

export function PendingInviteControl({ invitationId }: { invitationId: string }) {
  const [pending, startTransition] = useTransition();
  return <button type="button" className="pending-invite-cancel" disabled={pending} onClick={() => startTransition(async () => { await cancelBrandInvitation(invitationId); })}>{pending ? "취소 중" : "초대 취소"}</button>;
}
