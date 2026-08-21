import { getCatalog, getCommunities, getEvents, getFeatures, getJobs, getSupportPrograms } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const siteLink = (path: string) => `${SITE_URL}${path}`;
const clean = (value: string | undefined) => value?.replace(/\s+/g, " ").trim() ?? "";
const markdownItem = (label: string, path: string, description: string) =>
  `- [${clean(label)}](${siteLink(path)}): ${clean(description)}`;

export async function GET() {
  const [{ brands, products, founders }, features, events, supportPrograms, communities, jobs] = await Promise.all([
    getCatalog(),
    getFeatures(),
    getEvents(),
    getSupportPrograms(),
    getCommunities(),
    getJobs(),
  ]);

  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));

  const content = [
    "# Featable 피터블",
    "",
    "> Featable(피터블)은 창업가, 브랜드, 제품, 스토리와 창업 기회를 연결하는 공개 발견 플랫폼입니다.",
    "",
    "## 브랜드",
    "",
    ...brands.map((brand) => markdownItem(
      brand.name,
      `/brands/${encodeURIComponent(brand.slug)}`,
      `${brand.tagline} ${brand.description}`,
    )),
    "",
    "## 프로덕트",
    "",
    ...products.map((product) => {
      const brandName = brandBySlug.get(product.brandSlug)?.name;
      return markdownItem(
        product.name,
        `/products/${encodeURIComponent(product.slug)}`,
        `${product.tagline}${brandName ? ` ${brandName}의 제품입니다.` : ""} ${product.solution}`,
      );
    }),
    "",
    "## 창업가",
    "",
    ...founders.map((founder) => markdownItem(
      founder.name,
      `/founders/${encodeURIComponent(founder.slug)}`,
      `${founder.headline}${founder.bio ? ` ${founder.bio}` : ""}`,
    )),
    "",
    "## 스토리",
    "",
    ...features.map((feature) => markdownItem(
      feature.title,
      `/stories/${encodeURIComponent(feature.slug)}`,
      `${feature.excerpt} ${feature.kind}`,
    )),
    "",
    "## 이벤트",
    "",
    ...events.map((event) => markdownItem(
      event.name,
      `/events/${encodeURIComponent(event.slug)}`,
      `${event.host}가 주최하며 ${event.location}에서 진행됩니다.`,
    )),
    "",
    "## 지원사업",
    "",
    ...supportPrograms.map((program) => markdownItem(
      program.name,
      `/support/${encodeURIComponent(program.slug)}`,
      `${program.agency}의 ${program.target} 대상 창업 지원 프로그램입니다. 지역: ${program.region}.`,
    )),
    "",
    "## 커뮤니티",
    "",
    ...communities.map((community) => markdownItem(
      community.name,
      `/communities/${encodeURIComponent(community.slug)}`,
      `${community.field} 분야의 커뮤니티입니다. ${community.intro}`,
    )),
    "",
    "## 채용",
    "",
    ...jobs.map((job) => markdownItem(
      job.title,
      `/jobs/${encodeURIComponent(job.slug)}`,
      `${brandBySlug.get(job.brandSlug)?.name ?? "Featable 공개 브랜드"}의 ${job.role} 포지션입니다. 근무지: ${job.location}.`,
    )),
    "",
    "## 공개 목록",
    "",
    markdownItem("프로덕트 목록", "/products", "공개된 제품을 탐색합니다."),
    markdownItem("브랜드 목록", "/brands", "공개된 브랜드를 탐색합니다."),
    markdownItem("스토리 목록", "/stories", "공개된 창업가·브랜드 스토리를 읽습니다."),
    markdownItem("이벤트 목록", "/events", "공개 이벤트를 확인합니다."),
    markdownItem("지원사업 목록", "/support", "공개 창업 지원 프로그램을 확인합니다."),
    markdownItem("커뮤니티 목록", "/communities", "공개 커뮤니티를 탐색합니다."),
    markdownItem("채용 목록", "/jobs", "공개 채용 정보를 확인합니다."),
    "",
  ].join("\n");

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
