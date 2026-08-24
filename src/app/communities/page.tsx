import Link from "next/link";
import { Footer, Header } from "@/components/site-shell";
import { getCommunities, getPartners } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import { CommunityDirectoryCard } from "@/components/publishing-preview-cards";

export const metadata = createPageMetadata({
  title: "창업 커뮤니티 찾기",
  description:
    "관심 분야와 활동을 기준으로 나에게 맞는 창업 커뮤니티를 찾아보세요. 함께 성장하는 창업가와 브랜드의 네트워크를 만날 수 있습니다.",
  path: "/communities",
});

const sortOptions = [
  { value: "activity", label: "활동순" },
  { value: "latest", label: "최신순" },
  { value: "name", label: "이름순" },
] as const;

type CommunitySort = (typeof sortOptions)[number]["value"];

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function makeCommunitiesHref({ field, q, sort }: { field?: string; q?: string; sort: CommunitySort }) {
  const params = new URLSearchParams();
  if (field) params.set("field", field);
  if (q) params.set("q", q);
  params.set("sort", sort);
  const query = params.toString();
  return query ? `/communities?${query}` : "/communities";
}

function activityScore(community: Awaited<ReturnType<typeof getCommunities>>[number]) {
  return (community.founderSlugs?.length ?? 0) + (community.brandSlugs?.length ?? 0) + (community.eventSlugs?.length ?? 0);
}

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ field?: string | string[]; q?: string | string[]; sort?: string | string[] }> }) {
  const params = await searchParams;
  const field = getSearchParam(params.field);
  const q = getSearchParam(params.q);
  const requestedSort = getSearchParam(params.sort);
  const sort: CommunitySort = sortOptions.some((option) => option.value === requestedSort) ? requestedSort as CommunitySort : "activity";
  const [communities, partners] = await Promise.all([getCommunities(), getPartners()]);
  const fields = Array.from(new Set(communities.map((community) => community.field)));
  const keyword = q.trim().toLowerCase();
  const filtered = communities
    .filter((community) => (!field || community.field === field) && (!keyword || `${community.name} ${community.intro} ${community.field}`.toLowerCase().includes(keyword)))
    .map((community, index) => ({ community, sourceIndex: index, score: activityScore(community) }))
    .sort((a, b) => {
      if (sort === "name") return a.community.name.localeCompare(b.community.name, "ko-KR") || a.sourceIndex - b.sourceIndex;
      if (sort === "latest") return a.sourceIndex - b.sourceIndex;
      return b.score - a.score || a.community.name.localeCompare(b.community.name, "ko-KR") || a.sourceIndex - b.sourceIndex;
    });

  return (
    <>
      <Header />
      <main className="community-hub">
        <div className="shell community-hub-inner">
          <header className="community-toolbar">
            <div><h1>커뮤니티 찾기</h1><span>{communities.length}개의 커뮤니티</span></div>
            <form action="/communities"><input name="q" defaultValue={q} placeholder="커뮤니티 이름이나 분야 검색" />{field && <input type="hidden" name="field" value={field} />}<input type="hidden" name="sort" value={sort} /><button>검색</button></form>
          </header>

          <nav className="community-filters" aria-label="커뮤니티 분야">
            <Link className={!field ? "active" : ""} href={makeCommunitiesHref({ q, sort })}>전체</Link>
            {fields.map((item) => <Link className={field === item ? "active" : ""} href={makeCommunitiesHref({ field: item, q, sort })} key={item}>{item}</Link>)}
          </nav>

          <section className="community-directory-panel">
            <div className="community-panel-head">
              <div><strong>{field ? `${field} 커뮤니티` : "지금 활발한 커뮤니티"}</strong><span>검색 결과 {filtered.length}개</span></div>
              <nav className="community-sort" aria-label="커뮤니티 정렬">
                {sortOptions.map((option) => <Link className={sort === option.value ? "active" : ""} href={makeCommunitiesHref({ field, q, sort: option.value })} aria-current={sort === option.value ? "page" : undefined} key={option.value}>{option.label}</Link>)}
              </nav>
            </div>
            <div className="community-directory-list">
            {filtered.map(({ community }) => (
              <CommunityDirectoryCard
                slug={community.slug}
                key={community.slug}
                name={community.name}
                logoUrl={community.logoUrl}
                field={community.field}
                intro={community.intro}
              />
            ))}
            {filtered.length === 0 && <p className="community-empty">조건에 맞는 커뮤니티가 없습니다.</p>}
            </div>
          </section>
        </div>
      </main>
      <Footer partners={partners} />
    </>
  );
}
