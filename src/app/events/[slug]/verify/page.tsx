import type { Metadata } from "next";
import { Footer, Header } from "@/components/site-shell";
import { getPartners } from "@/lib/data";
import { GuestVerificationCard } from "./verification-card";

export const metadata: Metadata = { title: "행사 신청 확인", robots: { index: false, follow: false } };

export default async function GuestEventVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ slug }, { token }, partners] = await Promise.all([params, searchParams, getPartners()]);
  return <><Header /><main className="event-verification-page"><GuestVerificationCard slug={slug} token={token ?? ""} /></main><Footer partners={partners} /></>;
}
