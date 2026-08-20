import type { MetadataRoute } from "next";
import { getCatalog, getCommunities, getEvents, getFeatures, getJobs, getSupportPrograms } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

const absoluteUrl = (path: string) => new URL(path, `${SITE_URL}/`).toString();

const imageUrls = (...urls: Array<string | undefined>) =>
  [...new Set(urls.filter((url): url is string => Boolean(url)))];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ brands, products, founders }, features, events, supportPrograms, communities, jobs] = await Promise.all([
    getCatalog(),
    getFeatures(),
    getEvents(),
    getSupportPrograms(),
    getCommunities(),
    getJobs(),
  ]);

  const staticPaths = [
    "",
    "/products",
    "/brands",
    "/stories",
    "/events",
    "/support",
    "/communities",
    "/jobs",
    "/partners",
  ].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
    ...(path === "" ? { images: [absoluteUrl("/featable-logo.png")] } : {}),
  }));

  const brandEntries = brands.map((brand) => ({
    url: absoluteUrl(`/brands/${brand.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.7,
    images: imageUrls(brand.coverUrl, brand.logoUrl),
  }));

  const productEntries = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.7,
    images: imageUrls(product.heroUrl, ...product.images),
  }));

  const founderEntries = founders.map((founder) => ({
    url: absoluteUrl(`/founders/${founder.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.6,
    images: imageUrls(founder.avatarUrl),
  }));

  const featureEntries = features.map((feature) => ({
    url: absoluteUrl(`/stories/${feature.slug}`),
    lastModified: feature.publishedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
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

  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  const jobEntries = jobs.map((job) => ({
    url: absoluteUrl(`/jobs/${job.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.5,
    images: imageUrls(brandBySlug.get(job.brandSlug)?.logoUrl),
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
    ...jobEntries,
  ];
}
