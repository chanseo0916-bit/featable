import type { StoryBlock } from "@/lib/types";

export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 155;

export function normalizeSeoText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function conciseSeoDescription(value?: string | null, limit = SEO_DESCRIPTION_LIMIT): string {
  const text = normalizeSeoText(value);
  if (text.length <= limit) return text;
  const candidate = text.slice(0, limit + 1);
  const sentenceEnd = Math.max(candidate.lastIndexOf("."), candidate.lastIndexOf("다."), candidate.lastIndexOf("요."));
  if (sentenceEnd >= Math.floor(limit * 0.55)) return candidate.slice(0, sentenceEnd + 1);
  const wordEnd = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, wordEnd >= Math.floor(limit * 0.65) ? wordEnd : limit).trim()}…`;
}

export function seoTitle(explicit: string | undefined, fallback: string): string {
  const value = normalizeSeoText(explicit) || normalizeSeoText(fallback);
  return value.length <= SEO_TITLE_LIMIT ? value : `${value.slice(0, SEO_TITLE_LIMIT - 1).trim()}…`;
}

export function cleanSeoSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function storyText(blocks: StoryBlock[]): string {
  return blocks.flatMap((block) => {
    if (block.type === "text") return [block.heading, block.body];
    if (block.type === "features") return [block.heading, ...block.items.flatMap((item) => [item.title, item.body])];
    return [block.alt, block.caption];
  }).filter(Boolean).join(" ");
}

export function seoScore(input: { slug?: string; title?: string; description?: string; keyword?: string; image?: string; content?: string }): number {
  const title = normalizeSeoText(input.title);
  const description = normalizeSeoText(input.description);
  const content = normalizeSeoText(input.content);
  const keyword = normalizeSeoText(input.keyword).toLowerCase();
  let score = 0;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug ?? "")) score += 15;
  if (title.length >= 15 && title.length <= SEO_TITLE_LIMIT) score += 20;
  if (description.length >= 70 && description.length <= 165) score += 20;
  if (input.image) score += 15;
  if (content.length >= 180) score += 20;
  if (keyword && `${title} ${description} ${content}`.toLowerCase().includes(keyword)) score += 10;
  return score;
}

export function normalizeKeywords(value?: string[] | null): string[] {
  return [...new Set((value ?? []).map(normalizeSeoText).filter(Boolean))].slice(0, 8);
}
