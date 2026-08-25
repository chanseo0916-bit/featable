import Link from "next/link";
import { EntityCard, Badge } from "@/components/cards/entity-card";
import { Header } from "@/components/site-shell";
import { getCatalog, getFeatures, getJobs, getSupportPrograms } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";
import "@/styles/search.css";

export const metadata = {
  ...createPageMetadata({
    title: "검색",
    description: "창업가, 브랜드, 프로덕트와 지원사업을 Featable에서 검색해보세요.",
    path: "/search",
  }),
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

type SearchResult = {
  href: string;
  title: string;
  description: string;
  badge: string;
  logo: string | null;
};

type BestItem = {
  href: string;
  title: string;
  description: string;
  imageUrl: string;
  viewCount: number;
};

const MAX_SEARCH_RESULTS = 12;

function normalize(value: string) {
  return value.toLocaleLowerCase("ko-KR");
}

function matches(query: string, ...values: Array<string | undefined>) {
  return values.some((value) => value && normalize(value).includes(query));
}

function relevance(query: string, item: SearchResult) {
  const title = normalize(item.title);
  const description = normalize(item.description);

  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  if (description.startsWith(query)) return 3;
  return 4;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const displayQuery = rawQuery.trim();
  const query = normalize(displayQuery);
  const [{ brands, products, founders }, features, supportPrograms, jobs] =
    await Promise.all([
      getCatalog(),
      getFeatures(),
      getSupportPrograms(),
      getJobs(),
    ]);

  const brandsBySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  const foundersBySlug = new Map(
    founders.map((founder) => [founder.slug, founder]),
  );

  const bestItems: BestItem[] = [
    ...products.map((product) => ({
      href: `/products/${product.slug}`,
      title: product.name,
      description: `프로덕트 · ${brandsBySlug.get(product.brandSlug)?.name ?? "Featable"} · ${product.category}`,
      imageUrl: product.heroUrl,
      viewCount: product.viewCount ?? 0,
    })),
    ...features
      .filter((feature) => feature.kind === "interview")
      .map((feature) => ({
        href: `/stories/${feature.slug}`,
        title: feature.title,
        description: `인터뷰 · ${
          (feature.founderSlug
            ? foundersBySlug.get(feature.founderSlug)?.name
            : undefined) ??
          (feature.brandSlug
            ? brandsBySlug.get(feature.brandSlug)?.name
            : undefined) ??
          "Featable"
        }`,
        imageUrl: feature.coverUrl,
        viewCount: feature.viewCount ?? 0,
      })),
  ]
    .sort(
      (a, b) =>
        b.viewCount - a.viewCount || a.title.localeCompare(b.title, "ko-KR"),
    )
    .slice(0, 5);

  const results: SearchResult[] = !query
    ? []
    : [
        ...founders
          .filter((founder) => matches(query, founder.name, founder.headline))
          .map((founder) => ({
            href: `/founders/${founder.slug}`,
            title: founder.name,
            description: founder.headline,
            badge: "파운더",
            logo: founder.avatarUrl,
          })),
        ...products
          .filter((product) =>
            matches(
              query,
              product.name,
              product.tagline,
              product.category,
              brandsBySlug.get(product.brandSlug)?.name,
            ),
          )
          .map((product) => ({
            href: `/products/${product.slug}`,
            title: product.name,
            description: `${brandsBySlug.get(product.brandSlug)?.name ?? "Featable"} · ${product.tagline}`,
            badge: "프로덕트",
            logo: product.heroUrl,
          })),
        ...brands
          .filter((brand) =>
            matches(query, brand.name, brand.tagline, brand.category),
          )
          .map((brand) => ({
            href: `/brands/${brand.slug}`,
            title: brand.name,
            description: brand.tagline,
            badge: "브랜드",
            logo: brand.logoUrl,
          })),
        ...supportPrograms
          .filter((program) =>
            matches(
              query,
              program.name,
              program.agency,
              program.target,
              program.region,
              program.field,
            ),
          )
          .map((program) => ({
            href: `/support/${program.slug}`,
            title: program.name,
            description: `${program.agency} · ${program.target}`,
            badge: "지원사업",
            logo: null,
          })),
        ...jobs
          .filter((job) =>
            matches(
              query,
              job.title,
              job.role,
              job.location,
              job.organizationName,
            ),
          )
          .map((job) => ({
            href: `/jobs/${job.slug}`,
            title: job.title,
            description: [job.organizationName, job.role, job.location]
              .filter(Boolean)
              .join(" · "),
            badge: "채용",
            logo:
              job.organizationLogoUrl ??
              (job.brandSlug
                ? brandsBySlug.get(job.brandSlug)?.logoUrl ?? null
                : null),
          })),
      ].sort(
        (a, b) =>
          relevance(query, a) - relevance(query, b) ||
          a.title.localeCompare(b.title, "ko-KR"),
      );

  const visibleResults = results.slice(0, MAX_SEARCH_RESULTS);

  return (
    <>
      <Header />
      <main className="search-page">
        <div className="shell search-screen">
          <h1 className="sr-only">Featable 검색</h1>
          <div className="search-bar-row">
            {query && (
              <Link
                className="search-reset-link"
                href="/search"
                aria-label="검색어를 지우고 검색 화면으로 돌아가기"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m14.5 5-7 7 7 7" />
                </svg>
              </Link>
            )}
            <form
              className="search-primary-form"
              action="/search"
              role="search"
              aria-label="Featable 검색"
            >
              <input
                id="search-query"
                name="q"
                defaultValue={displayQuery}
                aria-label="검색어"
                placeholder="창업가, 브랜드, 프로덕트를 검색해보세요"
              />
              <button type="submit" aria-label="검색">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 4 4" />
                </svg>
              </button>
            </form>
          </div>

          {query ? (
            <section className="search-result-panel" aria-labelledby="search-result-title">
              <div className="search-section-heading">
                <h2 id="search-result-title">검색 결과</h2>
                <p>
                  <strong>“{displayQuery}”</strong> {results.length}개
                  {results.length > MAX_SEARCH_RESULTS &&
                    ` · 상위 ${MAX_SEARCH_RESULTS}개 표시`}
                </p>
              </div>

              {visibleResults.length > 0 ? (
                <ul className="search-result-list">
                  {visibleResults.map((item) => (
                    <li key={item.href}>
                      <EntityCard
                        layout="row"
                        className="search-result-card"
                        href={item.href}
                        logo={item.logo}
                        logoAlt=""
                        title={item.title}
                        badge={<Badge>{item.badge}</Badge>}
                        description={item.description}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="search-empty-result">
                  <strong>일치하는 결과가 없어요</strong>
                  <p>다른 이름이나 짧은 단어로 다시 검색해보세요.</p>
                </div>
              )}
            </section>
          ) : (
            <section className="search-best" aria-labelledby="search-best-title">
              <div className="search-section-heading">
                <h2 id="search-best-title">실시간 베스트</h2>
              </div>

              <ol className="search-best-list">
                {bestItems.map((item, index) => (
                  <li className="search-best-item" key={item.href}>
                    <span className="search-best-rank" aria-label={`${index + 1}위`}>
                      {index + 1}
                    </span>
                    <EntityCard
                      layout="row"
                      className="search-best-card"
                      href={item.href}
                      logo={item.imageUrl}
                      logoAlt=""
                      title={item.title}
                      description={item.description}
                    />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
