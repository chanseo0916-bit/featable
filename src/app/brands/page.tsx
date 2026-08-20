import { Footer, Header } from "@/components/site-shell";
import { BrandCard } from "@/components/content-cards";
import { getCatalog, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "신생 브랜드 발견",
  description:
    "새로운 관점으로 시장을 만드는 신생 브랜드를 발견하세요. 브랜드의 제품과 창업가 이야기를 한곳에서 살펴볼 수 있습니다.",
  path: "/brands",
});

export default async function BrandsPage() { const partners = await getPartners(); const { brands } = await getCatalog(); return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">BRAND DISCOVERY</p><h1>브랜드</h1><p>새로운 관점과 제품을 만드는 팀을 만나보세요.</p></div></div><div className="brand-grid">{brands.map((brand) => <BrandCard brand={brand} key={brand.slug} />)}</div></main><Footer partners={partners} /></>; }
