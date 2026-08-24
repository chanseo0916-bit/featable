import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getCatalog, getJob, getPartners } from "@/lib/data";
import {
  breadcrumbJsonLd,
  createDetailMetadata,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return {};
  const { brands } = await getCatalog();
  const organizationName = job.organizationName ?? (job.brandSlug ? brands.find((item) => item.slug === job.brandSlug)?.name : undefined) ?? "Featable";
  return createDetailMetadata({
    title: job.title,
    description: (job.description || `${organizationName}에서 ${job.role}로 합류할 동료를 찾고 있습니다.`).slice(0, 160),
    path: `/jobs/${job.slug}`,
  });
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [job, partners, { brands }] = await Promise.all([getJob(slug), getPartners(), getCatalog()]);
  if (!job) notFound();
  const organizationName = job.organizationName ?? (job.brandSlug ? brands.find((item) => item.slug === job.brandSlug)?.name : undefined) ?? "Featable";
  const jobPath = `/jobs/${job.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Featable", path: "/" },
        { name: "채용", path: "/jobs" },
        { name: job.title, path: jobPath },
      ]),
    ],
  } satisfies SeoSchema;

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="detail-page">
        <div className="detail-kicker"><Badge tone="orange">{job.type}</Badge><span>{job.location}</span></div>
        <h1>{job.title}</h1>
        <p className="detail-lede">{organizationName}에서 {job.role}로 합류할 동료를 찾고 있습니다.</p>
        <div className="job-detail-card"><p className="eyebrow">역할</p><h2>{job.role}</h2><p className="eyebrow">근무지</p><h2>{job.location}</h2>{job.deadline && <><p className="eyebrow">지원 마감</p><h2>{new Date(`${job.deadline}T00:00:00+09:00`).toLocaleDateString("ko-KR")}</h2></>}</div>
        {job.description && <section className="job-detail-copy"><span>ABOUT THE ROLE</span><h2>함께할 일을 소개합니다</h2><p>{job.description}</p></section>}
        {!!job.requirements?.length && <section className="job-detail-copy"><span>REQUIREMENTS</span><h2>이런 분을 찾고 있어요</h2><ul>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        {job.applyUrl && <a className="button" href={job.applyUrl} target="_blank" rel="noopener noreferrer">지원하기 ↗</a>}
      </main>
      <Footer partners={partners} />
    </>
  );
}
