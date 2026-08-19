import type { MetadataRoute } from "next";
import { getCatalog, getCommunities, getEvents, getFeatures, getSupportPrograms } from "@/lib/data";
import {
  jobs,
} from "@/lib/mock";
import { SITE_URL } from "@/lib/site";

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
    "/jobs",
    "/partners",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const entries = [
    ...brands.map((b) => `/brands/${b.slug}`),
    ...products.map((p) => `/products/${p.slug}`),
    ...founders.map((f) => `/founders/${f.slug}`),
    ...features.map((f) => `/stories/${f.slug}`),
    ...events.map((e) => `/events/${e.slug}`),
    ...supportPrograms.map((s) => `/support/${s.slug}`),
    ...communities.map((c) => `/communities/${c.slug}`),
    ...jobs.map((j) => `/jobs/${j.slug}`),
  ].map((path) => ({
    url: `${SITE_URL}${encodeURI(path)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPaths, ...entries];
}
