"use client";

import { useState, useTransition } from "react";
import { inviteEventCohost, removeEventCohost } from "./cohost-actions";

type Cohost = { id: string; email: string; role: string; profile?: { full_name?: string | null } | null };

export function EventCohostManager({ eventId, slug, initial }: { eventId: string; slug: string; initial: Cohost[] }) {
  const [cohosts, setCohosts] = useState(initial);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const invite = () => startTransition(async () => { setNotice(""); const result = await inviteEventCohost(eventId, slug, email); if (!result.ok) return setNotice(result.error ?? "초대하지 못했습니다."); setEmail(""); setNotice("공동 주최자로 추가했습니다. 상대방에게 알림이 전송됐어요."); window.location.reload(); });
  const remove = (id: string) => startTransition(async () => { const result = await removeEventCohost(eventId, slug, id); if (!result.ok) return setNotice(result.error ?? "삭제하지 못했습니다."); setCohosts((current) => current.filter((item) => item.id !== id)); });
  return <section className="event-cohost-manager"><header><div><span>CO-HOSTS</span><h2>함께 주최하는 사람</h2><p>추가된 공동 주최자는 신청자 확인과 행사 설정을 함께 관리할 수 있어요.</p></div></header><div className="event-cohost-invite"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Featable 가입 이메일" /><button className="button" type="button" disabled={pending || !email.trim()} onClick={invite}>{pending ? "추가 중…" : "공동 주최자 추가"}</button></div>{notice && <p className="event-settings-message">{notice}</p>}<div className="event-cohost-list">{cohosts.length ? cohosts.map((cohost) => <article key={cohost.id}><i>{(cohost.profile?.full_name || cohost.email).slice(0, 1).toUpperCase()}</i><div><strong>{cohost.profile?.full_name || "Featable 멤버"}</strong><span>{cohost.email}</span></div><em>공동 주최</em><button type="button" disabled={pending} onClick={() => remove(cohost.id)}>삭제</button></article>) : <p>아직 함께 주최하는 사람이 없습니다.</p>}</div></section>;
}
