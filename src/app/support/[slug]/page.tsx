import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getSupportPrograms, getPartners } from "@/lib/data";
import {
  breadcrumbJsonLd,
  createDetailMetadata,
  JsonLd,
  type SeoSchema,
} from "@/components/seo-json-ld";
import { SaveButton } from "@/components/save-button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const program = (await getSupportPrograms()).find((item) => item.slug === slug);
  if (!program) return {};
  return createDetailMetadata({
    title: program.name,
    description: `${program.agency}에서 진행하는 창업 지원 프로그램입니다. ${program.target}`.slice(0, 160),
    path: `/support/${program.slug}`,
  });
}

export default async function SupportDetailPage({ params }: { params: Promise<{ slug: string }> }) { const partners = await getPartners();
  const { slug } = await params;
  const program = (await getSupportPrograms()).find((item) => item.slug === slug);
  if (!program) notFound();

  const programPath = `/support/${program.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbJsonLd([
        { name: "Featable", path: "/" },
        { name: "지원사업", path: "/support" },
        { name: program.name, path: programPath },
      ]),
    ],
  } satisfies SeoSchema;

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="detail-page">
        <div className="detail-kicker"><Badge tone="orange">{program.status}</Badge><span>마감일 {program.closeAt}</span></div>
        <h1>{program.name}</h1>
        <p className="detail-lede">{program.agency}에서 진행하는 창업 지원 프로그램입니다.</p>
        <div className="support-detail-grid"><div><p className="eyebrow">지원 대상</p><h2>{program.target}</h2></div><div><p className="eyebrow">지원 규모</p><h2>{program.amount ?? "사업별 상이"}</h2></div><div><p className="eyebrow">지원 지역</p><h2>{program.region}</h2></div><div><p className="eyebrow">주요 내용</p><h2>{program.benefits}</h2></div></div>
        <div className="detail-actions"><SaveButton itemType="support" slug={program.slug} /><a className="button" href={program.applyUrl}>공식 공고 확인하기 ↗</a></div>
      </main>
      <Footer partners={partners} />
    </>
  );
}
