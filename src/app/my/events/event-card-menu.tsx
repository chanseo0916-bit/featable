"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOwnedEvent, setEventRegistrationOpen } from "./[slug]/actions";

type RegistrationMode = "internal" | "external" | "closed";

export function EventCardMenu({ eventId, slug, name, registrationMode: initialMode, canDelete }: {
  eventId: string;
  slug: string;
  name: string;
  registrationMode: RegistrationMode;
  canDelete: boolean;
}) {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function close({ focus = false } = {}) {
      detailsRef.current?.removeAttribute("open");
      if (focus) detailsRef.current?.querySelector<HTMLElement>("summary")?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close({ focus: true });
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeMenu() {
    detailsRef.current?.removeAttribute("open");
    setOpen(false);
  }

  function toggleRegistration() {
    setError("");
    startTransition(async () => {
      const result = await setEventRegistrationOpen({ eventId, slug, open: mode === "closed" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMode(result.registrationMode);
      closeMenu();
      router.refresh();
    });
  }

  async function copyLink() {
    setError("");
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/events/${slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("행사 링크를 복사하지 못했습니다.");
    }
  }

  function remove() {
    if (!window.confirm(`'${name}' 행사를 삭제할까요?\n신청자 데이터와 공지 내역도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteOwnedEvent({ eventId, slug });
      if (!result.ok) {
        setError(result.error ?? "행사를 삭제하지 못했습니다.");
        return;
      }
      closeMenu();
      router.refresh();
    });
  }

  return <details className="my-event-card-menu" ref={detailsRef} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary aria-label={`${name} 행사 메뉴`} aria-haspopup="menu" aria-expanded={open}><MenuIcon name="more" /></summary>
    <div className="my-event-card-menu-popover" role="menu">
      <Link href={`/my/events/${slug}`} role="menuitem"><MenuIcon name="edit" />행사 관리</Link>
      <Link href={`/events/${slug}`} target="_blank" rel="noreferrer" role="menuitem"><MenuIcon name="external" />공개 페이지 열기</Link>
      <button type="button" role="menuitem" onClick={toggleRegistration} disabled={pending}><MenuIcon name={mode === "closed" ? "play" : "pause"} />{mode === "closed" ? "신청 다시 받기" : "신청 마감"}</button>
      <button type="button" role="menuitem" onClick={copyLink}><MenuIcon name="copy" />{copied ? "링크 복사됨" : "행사 링크 복사"}</button>
      {canDelete && <><hr /><button className="is-danger" type="button" role="menuitem" onClick={remove} disabled={pending}><MenuIcon name="trash" />{pending ? "처리 중…" : "행사 삭제"}</button></>}
      {error && <p role="alert">{error}</p>}
    </div>
  </details>;
}

function MenuIcon({ name }: { name: "more" | "edit" | "external" | "play" | "pause" | "copy" | "trash" }) {
  if (name === "more") return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
  const paths = {
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    external: <><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M18 13v6H5V6h6" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    pause: <><path d="M8 5v14" /><path d="M16 5v14" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    trash: <><path d="M4 7h16" /><path d="m9 7 1-3h4l1 3" /><path d="m6 7 1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}
