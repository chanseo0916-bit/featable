import Link from "next/link";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getCatalog, getJobs, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "스타트업 채용",
  description:
    "좋은 스타트업 제품과 신생 브랜드를 만드는 팀의 채용 공고를 확인하세요. 제품에 진심인 팀과 함께할 기회를 찾아보세요.",
  path: "/jobs",
});

export default async function JobsPage() { const [jobs, partners, { brands }] = await Promise.all([getJobs(), getPartners(), getCatalog()]); return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><h1>채용</h1><p>좋은 제품을 만드는 팀에 합류하세요.</p></div></div><div className="job-list">{jobs.map((job) => { const brand = job.brandSlug ? brands.find((item) => item.slug === job.brandSlug) : undefined; const organizationName = job.organizationName ?? brand?.name ?? "Featable"; const logoUrl = job.organizationLogoUrl ?? brand?.logoUrl; return <Link href={`/jobs/${job.slug}`} className="job-row" key={job.slug}>{logoUrl ? <img className="brand-logo small" src={logoUrl} alt="" /> : <span className="job-logo-placeholder">{organizationName.slice(0, 1)}</span>}<div><h3>{job.title}</h3><p>{organizationName} · {job.role}</p></div><span>{job.location}</span><Badge>{job.type}</Badge><span className="arrow">→</span></Link>; })}</div></main><Footer partners={partners} /></>; }
