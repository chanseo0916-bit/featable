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

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <EntityCard
      layout="row"
      href={`/brands/${brand.slug}`}
      logo={brand.logoUrl}
      logoAlt={brand.name}
      title={brand.name}
      badge={<Badge>{brand.category}</Badge>}
      description={brand.tagline}
    />
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
