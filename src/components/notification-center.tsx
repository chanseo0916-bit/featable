"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getMyNotifications, markNotificationsRead, respondToEventCohostInvitation, respondToInAppInvitation, type SiteNotification } from "@/app/my/team-actions";

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function notificationMark(item: SiteNotification) {
  if (item.type === "team_invite") return "T";
  if (item.data.kind === "board_comment") return "댓";
  if (item.data.kind === "board_like") return "♥";
  return "F";
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SiteNotification[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const unread = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  async function refresh() { setItems(await getMyNotifications()); }

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      void markNotificationsRead();
    }
  }

  function respond(item: SiteNotification, accept: boolean) {
    if (!item.invitationId) return;
    startTransition(async () => {
      setError("");
      const result = await respondToInAppInvitation(item.invitationId!, accept);
      if (!result.ok) { setError(result.error); return; }
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, readAt: entry.readAt ?? new Date().toISOString(), actionStatus: accept ? "accepted" : "declined" }
        : entry));
      if (accept) {
        setOpen(false);
        router.push("/my?joined=1");
        router.refresh();
      }
    });
  }

  function respondToEvent(item: SiteNotification, accept: boolean) {
    if (!item.data.cohost_id) return;
    startTransition(async () => {
      setError("");
      const result = await respondToEventCohostInvitation(item.data.cohost_id!, accept);
      if (!result.ok) { setError(result.error); return; }
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, readAt: entry.readAt ?? new Date().toISOString(), actionStatus: accept ? "accepted" : "declined" }
        : entry));
      if (accept && result.eventSlug) {
        setOpen(false);
        router.push(`/my/events/${result.eventSlug}`);
        router.refresh();
      }
    });
  }

  return <div className="notification-center">
    <button type="button" className="notification-bell" aria-label={`알림 ${unread}개`} aria-expanded={open} onClick={toggle}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
    </button>
    {open && <><button type="button" className="notification-backdrop" aria-label="알림 닫기" onClick={() => setOpen(false)} /><section className="notification-panel">
      <header><div><strong>알림</strong></div><button type="button" onClick={() => setOpen(false)}>닫기</button></header>
      {error && <p className="notification-error">{error}</p>}
      {items.length ? <div className="notification-list">{items.map((item) => <article key={item.id} className={!item.readAt ? "unread" : ""}>
        <i>{notificationMark(item)}</i>
        <div><strong>{item.title}</strong><p>{item.message}</p><small>{relativeTime(item.createdAt)}</small>
          {item.data.kind === "event_cohost_invite" && item.data.cohost_id && !item.actionStatus
            ? <footer><button type="button" disabled={pending} onClick={() => respondToEvent(item, false)}>거절</button><button type="button" className="primary" disabled={pending} onClick={() => respondToEvent(item, true)}>초대 수락</button></footer>
            : item.type === "team_invite" && item.invitationId && !item.actionStatus ? <footer><button type="button" disabled={pending} onClick={() => respond(item, false)}>거절</button><button type="button" className="primary" disabled={pending} onClick={() => respond(item, true)}>팀 참여하기</button></footer> : item.actionStatus ? <span className={`notification-status ${item.actionStatus}`}>{item.actionStatus === "accepted" ? "참여 완료" : "초대 거절"}</span> : item.href ? <Link href={item.href}>확인하기 →</Link> : null}
        </div>
      </article>)}</div> : <div className="notification-empty"><span>✓</span><strong>새로운 알림이 없어요.</strong><p>팀 초대와 새로운 소식이 여기에 표시됩니다.</p></div>}
      <footer className="notification-panel-footer"><Link href="/my">내 스튜디오 열기 →</Link></footer>
    </section></>}
  </div>;
}
