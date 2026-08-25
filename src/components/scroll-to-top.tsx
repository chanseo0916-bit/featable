"use client";

import { useEffect, useState } from "react";
import styles from "@/components/scroll-to-top.module.css";

const SHOW_AFTER_PX = 520;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      className={`${styles.button}${visible ? ` ${styles.visible}` : ""}`}
      onClick={scrollToTop}
      aria-label="맨 위로 이동"
      title="맨 위로"
      tabIndex={visible ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />
      </svg>
      <span>TOP</span>
    </button>
  );
}
