import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/site-shell";
import { getFeatures, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import { ArticleCard } from "../story-cards";

const PER_PAGE = 24;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function parsePage(raw: string | string[] | undefined): number {
  const value = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""), 10);
  return Number.isFinite(value) && value > 1 ? value : 1;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  const base = createPageMetadata({
    title: page > 1 ? `창업 아티클 아카이브 ${page}페이지` : "창업 아티클 아카이브",
    description:
      "사업자등록부터 세무·지원사업까지, 창업 초기에 실제로 부딪히는 주제를 정리한 아티클 모음입니다.",
    path: "/stories/archive",
  });
  // 2페이지부터는 색인하지 않는다. 개별 글은 sitemap이 이미 전부 제출한다
  return page > 1 ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function StoriesArchivePage({ searchParams }: PageProps) {
  const page = parsePage((await searchParams).page);
  const [features, partners] = await Promise.all([getFeatures(), getPartners()]);
  const articles = features.filter((feature) => feature.kind !== "interview");
  const totalPages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  if (page > totalPages) notFound();

  const start = (page - 1) * PER_PAGE;
  const pageItems = articles.slice(start, start + PER_PAGE);
  const href = (target: number) => (target > 1 ? `/stories/archive?page=${target}` : "/stories/archive");

  return <>
    <Header />
    <main className="shell listing-page stories-page">
      <div className="listing-heading">
        <div>
          <p className="eyebrow">ARCHIVE</p>
          <h1>창업 아티클</h1>
          <p>사업자등록부터 세무·지원사업까지, 창업 초기에 부딪히는 주제를 모았습니다. 전체 {articles.length}편.</p>
        </div>
        <Link className="stories-section-more" href="/stories">인터뷰 보러 가기 <span aria-hidden="true">→</span></Link>
      </div>

      <div className="story-article-grid">
        {pageItems.map((feature) => <ArticleCard feature={feature} key={feature.slug} />)}
      </div>

      {totalPages > 1 && <nav className="story-pagination" aria-label="아티클 페이지 이동">
        {page > 1
          ? <Link href={href(page - 1)} rel="prev">← 이전</Link>
          : <span aria-hidden="true">← 이전</span>}
        <strong>{page} / {totalPages}</strong>
        {page < totalPages
          ? <Link href={href(page + 1)} rel="next">다음 →</Link>
          : <span aria-hidden="true">다음 →</span>}
      </nav>}
    </main>
    <Footer partners={partners} />
  </>;
}
