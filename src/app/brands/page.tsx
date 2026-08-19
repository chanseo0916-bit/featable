import { Footer, Header } from "@/components/site-shell";
import { BrandCard } from "@/components/content-cards";
import { brands, partners } from "@/lib/mock";
export default function BrandsPage() { return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">BRAND DISCOVERY</p><h1>브랜드</h1><p>새로운 관점과 제품을 만드는 팀을 만나보세요.</p></div></div><div className="brand-grid">{brands.map((brand) => <BrandCard brand={brand} key={brand.slug} />)}</div></main><Footer partners={partners} /></>; }
