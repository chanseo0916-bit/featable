import Link from "next/link";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getCatalog, getFeatures, getJobs, getPartners, getSupportPrograms } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = {
  ...createPageMetadata({
    title: "스타트업 검색",
    description:
      "스타트업 제품, 신생 브랜드, 창업가 인터뷰, 창업 지원사업과 커뮤니티를 Featable에서 한 번에 검색해보세요.",
    path: "/search",
  }),
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const { q = "" } = await searchParams; const [{ brands, products, founders }, features, supportPrograms, partners] = await Promise.all([getCatalog(), getFeatures(), getSupportPrograms(), getPartners()]); const query = q.trim().toLowerCase(); const matchingFounders = founders.filter((f) => !query || `${f.name} ${f.headline}`.toLowerCase().includes(query)); const matchingBrands = brands.filter((b) => !query || `${b.name} ${b.tagline}`.toLowerCase().includes(query)); const matchingProducts = products.filter((p) => !query || `${p.name} ${p.tagline}`.toLowerCase().includes(query)); const matchingFeatures = features.filter((f) => !query || `${f.title} ${f.excerpt}`.toLowerCase().includes(query)); const matchingSupport = supportPrograms.filter((s) => !query || `${s.name} ${s.agency} ${s.target}`.toLowerCase().includes(query)); const totalCount = matchingFounders.length + matchingProducts.length + matchingBrands.length + matchingFeatures.length + matchingSupport.length; return <><Header /><main className="shell listing-page search-page"><div className="search-heading compact"><form className="search-box" action="/search"><span>⌕</span><input name="q" defaultValue={q} placeholder="브랜드 · 창업가 · 제품 · 지원사업 검색" autoFocus={!q} /><button>검색</button></form></div>{q ? <p className="result-count"><strong>“{q}”</strong> 검색 결과 {totalCount}건</p> : <p className="result-count search-hint-line">파운더, 브랜드, 제품, 스토리, 지원사업을 한 번에 검색합니다.</p>}<div className="search-results"><ResultGroup title="파운더" items={matchingFounders.map((f) => ({ href: `/founders/${f.slug}`, title: f.name, description: f.headline, badge: "FOUNDER" }))} /><ResultGroup title="프로덕트" items={matchingProducts.map((p) => ({ href: `/products/${p.slug}`, title: p.name, description: p.tagline, badge: p.category }))} /><ResultGroup title="브랜드" items={matchingBrands.map((b) => ({ href: `/brands/${b.slug}`, title: b.name, description: b.tagline, badge: b.category }))} /><ResultGroup title="스토리" items={matchingFeatures.map((f) => ({ href: `/stories/${f.slug}`, title: f.title, description: f.excerpt, badge: "STORY" }))} /><ResultGroup title="지원사업" items={matchingSupport.map((s) => ({ href: `/support/${s.slug}`, title: s.name, description: `${s.agency} · ${s.target}`, badge: s.status }))} /></div></main><Footer partners={partners} /></>; }
function ResultGroup({ title, items }: { title: string; items: { href: string; title: string; description: string; badge: string }[] }) { return <section className="result-group"><h2>{title}<span>{items.length}</span></h2>{items.length ? items.map((item) => <Link className="result-row" href={item.href} key={item.href}><div><Badge>{item.badge}</Badge><h3>{item.title}</h3><p>{item.description}</p></div><span className="arrow">→</span></Link>) : <p className="empty-result">검색 결과가 없습니다.</p>}</section>; }
