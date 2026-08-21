import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BIZINFO_ENDPOINT = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";
const REGIONS = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

type BizinfoItem = Record<string, unknown>;

export interface BizinfoSyncResult {
  fetched: number;
  imported: number;
  inserted: number;
  updated: number;
  skipped: number;
}

function text(item: BizinfoItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function plainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function validWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function dateParts(value: string) {
  const matches = value.match(/(?:19|20)\d{2}[.\/-]?\d{2}[.\/-]?\d{2}/g) ?? [];
  return matches.map((value) => {
    const date = value.replace(/\D/g, "");
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  });
}

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function regionFrom(hashTags: string) {
  return REGIONS.find((region) => hashTags.includes(region)) ?? "전국";
}

function normalizeItem(item: BizinfoItem, today: string) {
  const sourceId = text(item, "pblancId", "seq");
  const name = plainText(text(item, "pblancNm", "title"));
  const applyUrl = text(item, "pblancUrl", "link", "rceptEngnHmpgUrl");
  const dates = dateParts(text(item, "reqstBeginEndDe", "reqstDt"));
  const closeAt = dates.at(-1);
  if (!sourceId || !name || !closeAt || closeAt < today || !validWebUrl(applyUrl)) return null;

  return {
    slug: `bizinfo-${sourceId.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`,
    name,
    agency: plainText(text(item, "jrsdInsttNm", "author", "excInsttNm")),
    target: plainText(text(item, "trgetNm")) || "중소기업·창업기업",
    benefits: plainText(text(item, "bsnsSumryCn", "description")) || "공식 공고에서 지원 내용을 확인해주세요.",
    amount: null,
    open_at: dates[0] ?? null,
    close_at: closeAt,
    region: regionFrom(text(item, "hashTags")),
    field: plainText(text(item, "pldirSportRealmLclasCodeNm", "lcategory")) || "창업",
    apply_url: applyUrl,
  };
}

export async function syncBizinfoSupportPrograms(): Promise<BizinfoSyncResult> {
  const apiKey = process.env.BIZINFO_API_KEY;
  const admin = createAdminClient();
  if (!apiKey) throw new Error("BIZINFO_API_KEY가 설정되지 않았습니다.");
  if (!admin) throw new Error("Supabase 관리자 연결이 설정되지 않았습니다.");

  const url = new URL(BIZINFO_ENDPOINT);
  url.searchParams.set("crtfcKey", apiKey);
  url.searchParams.set("dataType", "json");
  url.searchParams.set("searchCnt", "200");
  url.searchParams.set("searchLclasId", "06");
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`기업마당 API 요청 실패 (${response.status})`);

  const payload = await response.json() as unknown;
  const root = payload && typeof payload === "object" && !Array.isArray(payload) && "jsonArray" in payload
    ? (payload as { jsonArray: unknown }).jsonArray
    : payload;
  const rawItems = root && typeof root === "object" && !Array.isArray(root) && "item" in root
    ? (root as { item: unknown }).item
    : root;
  const items = (Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [])
    .filter((item): item is BizinfoItem => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  if (!items.length) throw new Error("기업마당 API가 공고 데이터를 반환하지 않았습니다.");
  const rows = items.map((item) => normalizeItem(item, todayInKorea())).filter((row) => row !== null);
  const slugs = rows.map((row) => row.slug);
  const { data: existing, error: existingError } = slugs.length
    ? await admin.from("support_programs").select("slug").in("slug", slugs)
    : { data: [], error: null };
  if (existingError) throw new Error(`기존 지원사업 조회 실패: ${existingError.message}`);
  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));

  if (rows.length) {
    const { error } = await admin.from("support_programs").upsert(rows, { onConflict: "slug" });
    if (error) throw new Error(`지원사업 저장 실패: ${error.message}`);
  }

  return {
    fetched: items.length,
    imported: rows.length,
    inserted: rows.filter((row) => !existingSlugs.has(row.slug)).length,
    updated: rows.filter((row) => existingSlugs.has(row.slug)).length,
    skipped: items.length - rows.length,
  };
}
