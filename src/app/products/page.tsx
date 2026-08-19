import { Header, Footer, SectionHeader } from "@/components/site-shell";
import { ProductCard } from "@/components/content-cards";
import { brands, partners, products } from "@/lib/mock";
import type { Category } from "@/lib/types";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const query = await searchParams; const filtered = query.category && query.category !== "전체" ? products.filter((p) => p.category === query.category) : products; return <><Header /><main className="shell listing-page"><div className="listing-heading"><div><p className="eyebrow">PRODUCT DISCOVERY</p><h1>프로덕트</h1><p>만든 사람의 이야기가 있는 제품을 발견하세요.</p></div><div className="filter-chips"><a className={!query.category ? "active" : ""} href="/products">전체</a>{["AI", "SaaS", "F&B", "콘텐츠"].map((cat) => <a className={query.category === cat ? "active" : ""} href={`/products?category=${cat}`} key={cat}>{cat}</a>)}</div></div><div className="listing-grid">{filtered.map((product) => <ProductCard key={product.slug} product={product} brandName={brands.find((b) => b.slug === product.brandSlug)?.name} />)}</div></main><Footer partners={partners} /></>; }
