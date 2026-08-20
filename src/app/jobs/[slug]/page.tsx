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
  const brand = brands.find((item) => item.slug === job.brandSlug);
  return createDetailMetadata({
    title: job.title,
    description: `${brand?.name ?? "Featable"}에서 ${job.role}로 합류할 동료를 찾고 있습니다.`.slice(0, 160),
    path: `/jobs/${job.slug}`,
  });
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [job, { brands }, partners] = await Promise.all([getJob(slug), getCatalog(), getPartners()]);
  if (!job) notFound();
  const brand = brands.find((b) => b.slug === job.brandSlug);
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
        <p className="detail-lede">{brand?.name}에서 {job.role}로 합류할 동료를 찾고 있습니다.</p>
        <div className="job-detail-card"><p className="eyebrow">ROLE</p><h2>{job.role}</h2><p className="eyebrow">LOCATION</p><h2>{job.location}</h2></div>
        {job.applyUrl && <a className="button" href={job.applyUrl}>지원하기 ↗</a>}
      </main>
      <Footer partners={partners} />
    </>
  );
}
