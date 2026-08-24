import type { MetadataRoute } from "next";
import { getCatalog, getCommunities, getEvents, getFeatures, getSupportPrograms } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

const absoluteUrl = (path: string) => new URL(path, `${SITE_URL}/`).toString();

const imageUrls = (...urls: Array<string | undefined>) =>
  [...new Set(urls.filter((url): url is string => Boolean(url)).map(absoluteUrl))];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ brands, products, founders }, features, events, supportPrograms, communities] = await Promise.all([
    getCatalog(),
    getFeatures(),
    getEvents(),
    getSupportPrograms(),
    getCommunities(),

  ]);

  const staticPaths = [
    "",
    "/products",
    "/brands",
    "/stories",
    "/events",
    "/support",
    "/communities",
    "/partners",
    "/partners/apply",
  ].map((path) => ({
    url: absoluteUrl(path),
    ...(path === "" ? { images: [absoluteUrl("/featable-logo.png")] } : {}),
  }));

  const brandEntries = brands.filter((brand) => brand.isIndexable !== false).map((brand) => ({
    url: absoluteUrl(`/brands/${brand.slug}`),
    ...(brand.updatedAt || brand.publishedAt ? { lastModified: brand.updatedAt ?? brand.publishedAt } : {}),
    images: imageUrls(brand.coverUrl, brand.logoUrl),
  }));

  const productEntries = products.filter((product) => product.isIndexable !== false).map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    ...(product.updatedAt || product.publishedAt ? { lastModified: product.updatedAt ?? product.publishedAt } : {}),
    images: imageUrls(product.heroUrl, ...product.images),
  }));

  const founderEntries = founders.map((founder) => ({
    url: absoluteUrl(`/founders/${founder.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.6,
    images: imageUrls(founder.avatarUrl),
  }));

  const featureEntries = features.filter((feature) => feature.isIndexable !== false).map((feature) => ({
    url: absoluteUrl(`/stories/${feature.slug}`),
    lastModified: feature.updatedAt ?? feature.publishedAt,
    images: imageUrls(feature.coverUrl),
  }));

  const eventEntries = events.map((event) => ({
    url: absoluteUrl(`/events/${event.slug}`),
    changeFrequency: "daily" as const,
    priority: 0.6,
    images: imageUrls(event.coverUrl),
  }));

  const supportEntries = supportPrograms.map((program) => ({
    url: absoluteUrl(`/support/${program.slug}`),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  const communityEntries = communities.map((community) => ({
    url: absoluteUrl(`/communities/${community.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.6,
    images: imageUrls(community.logoUrl),
  }));


  return [
    ...staticPaths,
    ...brandEntries,
    ...productEntries,
    ...founderEntries,
    ...featureEntries,
    ...eventEntries,
    ...supportEntries,
    ...communityEntries,
  ];
}
