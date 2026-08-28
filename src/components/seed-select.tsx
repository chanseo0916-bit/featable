"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface SeedSelectOption {
  value: string;
  label: string;
}

/**
 * SEED 스타일 셀렉트 — 네이티브 select 대신 커스텀 드롭다운(chevron + 옵션 메뉴 + 체크 표시).
 * 디자인 토큰만 사용, 키보드(화살표/Enter/Escape) 및 마우스 외 클릭 닫기 지원.
 */
export function SeedSelect({
  value,
  onChange,
  options,
  placeholder = "선택해주세요",
  id,
  className = "",
  ariaLabel,
  disabled = false,
  name,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SeedSelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);
  const activeLabel = selected?.label ?? "";

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function openMenu() {
    if (disabled) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function select(i: number) {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) setOpen(false);
      else openMenu();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onListKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0) select(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        aria-disabled={disabled}
        onClick={() => { if (disabled) return; if (open) setOpen(false); else openMenu(); }}
        onKeyDown={(e) => { if (disabled) return; onTriggerKeyDown(e); }}
        className={`w-full flex h-11 items-center justify-between gap-2 rounded-lg border border-border bg-white px-4 text-base whitespace-nowrap outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft ${activeLabel ? "text-fg-strong" : "text-fg-subtle"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <span className="truncate">{activeLabel || placeholder}</span>
        <svg
          className={`h-4 w-4 flex-none text-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          onKeyDown={onListKeyDown}
          className="absolute z-30 left-0 right-0 mt-2 max-h-[280px] overflow-auto rounded-xl border border-border bg-white py-1.5 shadow-lg"
        >
          {options.map((opt, i) => {
            const selectedOpt = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selectedOpt}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(i)}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-fg-strong transition-colors hover:bg-surface ${activeIndex === i ? "bg-surface" : ""} ${selectedOpt ? "font-bold" : ""}`}
              >
                <span className="truncate">{opt.label}</span>
                {selectedOpt && (
                  <svg
                    className="h-4 w-4 flex-none text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
