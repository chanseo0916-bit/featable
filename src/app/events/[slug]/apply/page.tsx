import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/lib/data";
import { EventRegistrationCard } from "../registration-card";

export const metadata: Metadata = { title: "행사 신청", robots: { index: false, follow: false } };

export default async function EventApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = (await getEvents()).find((item) => item.slug === slug);
  if (!event) notFound();
  if (event.registrationMode !== "internal") redirect(`/events/${slug}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: registration }] = user && event.id
    ? await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase.from("event_registrations").select("status").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
    ])
    : [{ data: null }, { data: null }];

  return <main className="event-apply-page">
    <header><Link href={`/events/${slug}`}>← 행사로 돌아가기</Link><div><span>신청하기</span><strong>{event.name}</strong></div><Link href="/">Featable</Link></header>
    <section className="event-apply-layout">
      <aside><img src={event.coverUrl} alt="" /><span>{event.category}</span><h1>{event.name}</h1><dl><div><dt>일시</dt><dd>{new Date(event.startsAt).toLocaleString("ko-KR")}</dd></div><div><dt>장소</dt><dd>{event.location}</dd></div><div><dt>주최</dt><dd>{event.host}</dd></div></dl></aside>
      <EventRegistrationCard eventId={event.id} slug={event.slug} host={event.host} mode="internal" capacity={event.capacity} approvalMode={event.approvalMode ?? "instant"} closed={event.registrationClosed ?? false} registrationFields={event.registrationFields} user={user ? { name: profile?.full_name?.trim() || user.user_metadata?.full_name || "Featable 멤버", email: user.email ?? "" } : undefined} registration={registration ? { status: registration.status as "verification_pending" | "pending" | "confirmed" | "waitlisted" | "rejected" | "cancelled" } : undefined} formOnly />
    </section>
  </main>;
}
