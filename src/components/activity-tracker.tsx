"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function ActivityTracker() {
  const pathname = usePathname(); const search = useSearchParams();
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    let sessionId = localStorage.getItem("featable_session_id");
    if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem("featable_session_id", sessionId); }
    const attribution = ["source", "medium", "campaign"].reduce<Record<string, string | null>>((values, key) => {
      const queryValue = search.get(`utm_${key}`);
      if (queryValue) localStorage.setItem(`featable_utm_${key}`, queryValue);
      values[key] = queryValue || localStorage.getItem(`featable_utm_${key}`);
      return values;
    }, {});
    const key = `pv:${pathname}:${search.toString()}`; if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1");
    void fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName: "page_view", sessionId, path: pathname, source: attribution.source, medium: attribution.medium, campaign: attribution.campaign }) });
  }, [pathname, search]);
  return null;
}
