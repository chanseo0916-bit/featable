import { Header, Footer } from "@/components/site-shell";
import { ProductCard } from "@/components/content-cards";
import { partners } from "@/lib/mock";
import { getCatalog } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import Link from "next/link";

export const metadata = createPageMetadata({
  title: "스타트업 제품 발견",
  description:
    "초기 사용자 확보를 고민하는 창업가와 팀을 위한 스타트업 제품을 만나보세요. 제품을 만든 사람의 이야기와 함께 새로운 프로덕트를 발견할 수 있습니다.",
  path: "/products",
});

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const query = await searchParams; const { brands, products } = await getCatalog(); const filtered = query.category && query.category !== "전체" ? products.filter((p) => p.category === query.category) : products; return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">PRODUCT DISCOVERY</p><h1>프로덕트</h1><p>만든 사람의 이야기가 있는 제품을 발견하세요.</p></div><div className="filter-chips"><Link className={!query.category ? "active" : ""} href="/products">전체</Link>{["AI", "SaaS", "F&B", "콘텐츠"].map((cat) => <Link className={query.category === cat ? "active" : ""} href={`/products?category=${cat}`} key={cat}>{cat}</Link>)}</div></div><div className="listing-grid">{filtered.map((product) => <ProductCard key={product.slug} product={product} brandName={brands.find((b) => b.slug === product.brandSlug)?.name} />)}</div></main><Footer partners={partners} /></>; }
