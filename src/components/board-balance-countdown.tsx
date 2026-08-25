"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/board-balance-countdown.module.css";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SECOND_MS = 1000;

function getNextKstMidnight(nowMs: number) {
  const kstNow = new Date(nowMs + KST_OFFSET_MS);
  const nextKstDate = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() + 1,
  );

  return nextKstDate - KST_OFFSET_MS;
}

function padTimeUnit(value: number) {
  return String(value).padStart(2, "0");
}

function formatRemaining(remainingMs: number) {
  const hours = Math.floor(remainingMs / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((remainingMs % MINUTE_MS) / SECOND_MS);

  return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`;
}

function formatDuration(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / SECOND_MS));
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  return `PT${hours}H${minutes}M${seconds}S`;
}

export function BoardBalanceCountdown({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const refreshedTargetRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;

    const updateCountdown = () => {
      if (disposed) return;

      const nowMs = Date.now();
      const targetMs = targetRef.current ?? getNextKstMidnight(nowMs);
      targetRef.current = targetMs;

      if (nowMs >= targetMs) {
        if (refreshedTargetRef.current !== targetMs) {
          refreshedTargetRef.current = targetMs;
          router.refresh();
        }

        const nextTargetMs = getNextKstMidnight(nowMs);
        targetRef.current = nextTargetMs;
        setRemainingMs(Math.max(0, nextTargetMs - nowMs));
        return;
      }

      setRemainingMs(targetMs - nowMs);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, SECOND_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [router]);

  const formattedRemaining = remainingMs === null
    ? "--:--:--"
    : formatRemaining(remainingMs);
  const composedClassName = className
    ? `${styles.countdown} ${className}`
    : styles.countdown;

  return (
    <span className={composedClassName}>
      <span className={styles.label}>00시 리셋까지</span>
      <time
        className={styles.time}
        dateTime={remainingMs === null ? undefined : formatDuration(remainingMs)}
      >
        {formattedRemaining}
      </time>
    </span>
  );
}

export default BoardBalanceCountdown;
