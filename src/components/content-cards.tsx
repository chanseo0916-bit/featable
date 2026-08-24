import Link from "next/link";
import { Badge, ImageCard } from "@/components/site-shell";
import { EntityCard } from "@/components/cards/entity-card";
import type { Brand, Feature, Product } from "@/lib/types";

export function ProductCard({ product, brandName }: { product: Product; brandName?: string }) {
  return (
    <EntityCard
      layout="image"
      href={`/products/${product.slug}`}
      media={product.heroUrl}
      mediaAlt={product.name}
      ratio={1.16}
      metaBadge={<Badge>{product.category}</Badge>}
      metaText={brandName ?? product.brandSlug}
      title={product.name}
      description={product.tagline}
    />
  );
}

/** 브랜드 카드 — 커뮤니티/파트너 row와 별개의 원래 스타일 유지 (사용자 확정) */
export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link href={`/brands/${brand.slug}`} className="brand-card">
      <img className="brand-logo" src={brand.logoUrl} alt="" />
      <div className="brand-card-copy">
        <h3>{brand.name}<Badge>{brand.category}</Badge></h3>
        <p>{brand.tagline}</p>
      </div>
      <span className="arrow">→</span>
    </Link>
  );
}

export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <EntityCard
      layout="image"
      href={`/stories/${feature.slug}`}
      media={feature.coverUrl}
      mediaAlt={feature.title}
      ratio={1.55}
      title={feature.title}
      description={feature.excerpt}
    />
  );
}

// re-exports kept so existing imports keep working
export { Badge, ImageCard };
