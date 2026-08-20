"use client";

/** 외부 링크(공식 사이트·구매 링크) 클릭을 애널리틱스에 기록하고 정상적으로 이동시킨다 */
export function TrackedLink({
  href,
  slug,
  className,
  children,
}: {
  href: string;
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  function trackClick() {
    try {
      const payload = JSON.stringify({ slug, type: "product", event: "click" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/view", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // 애널리틱스 실패가 실제 이동을 막으면 안 됨
    }
  }

  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
      {children}
    </a>
  );
}
