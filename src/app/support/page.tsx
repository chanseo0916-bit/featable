import Link from "next/link";
import { Footer, Header } from "@/components/site-shell";
import { getPartners, getSupportPrograms } from "@/lib/data";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "창업 지원사업 찾기",
  description:
    "예비·초기 창업가에게 필요한 창업 지원사업을 한곳에서 찾아보세요. 지역과 분야별 공고를 확인하고 내 브랜드에 맞는 기회를 발견할 수 있습니다.",
  path: "/support",
});

type SupportSearchParams = {
  region?: string | string[];
  field?: string | string[];
  page?: string | string[];
};

const PAGE_SIZE = 12;

const dday = (date: string) =>
  Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const uniqueValues = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<SupportSearchParams>;
}) {
  const [supportPrograms, partners, query] = await Promise.all([
    getSupportPrograms(),
    getPartners(),
    searchParams,
  ]);
  const regionOptions = uniqueValues(supportPrograms.map((program) => program.region));
  const fieldOptions = uniqueValues(supportPrograms.map((program) => program.field));
  const requestedRegion = firstParam(query.region);
  const requestedField = firstParam(query.field);
  const selectedRegion = regionOptions.includes(requestedRegion ?? "")
    ? requestedRegion
    : undefined;
  const selectedField = fieldOptions.includes(requestedField ?? "")
    ? requestedField
    : undefined;

  const filteredPrograms = supportPrograms.filter(
    (program) =>
      (!selectedRegion || program.region === selectedRegion) &&
      (!selectedField || program.field === selectedField),
  );
  const hasFilters = Boolean(selectedRegion || selectedField);
  const pageCount = Math.max(1, Math.ceil(filteredPrograms.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(firstParam(query.page) ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), pageCount)
    : 1;
  const pagePrograms = filteredPrograms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filterHref = (next: { region?: string; field?: string }) => {
    const params = new URLSearchParams();
    const region = "region" in next ? next.region : selectedRegion;
    const field = "field" in next ? next.field : selectedField;
    if (region) params.set("region", region);
    if (field) params.set("field", field);
    const queryString = params.toString();
    return queryString ? `/support?${queryString}` : "/support";
  };

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedField) params.set("field", selectedField);
    if (page > 1) params.set("page", String(page));
    const queryString = params.toString();
    return queryString ? `/support?${queryString}` : "/support";
  };

  return (
    <>
      <Header />
      <main className="shell listing-page">
        <div className="listing-heading">
          <div>
            <p className="eyebrow">STARTUP SUPPORT</p>
            <h1>지원사업</h1>
            <p>내 브랜드에 맞는 창업 지원 정보를 찾아보세요.</p>
          </div>
        </div>

        <div className="support-filter-toolbar" aria-label="지원사업 필터">
          <div className="support-filter-group">
            <span className="support-filter-label">지역</span>
            <div className="filter-chips">
              <Link
                className={!selectedRegion ? "active" : ""}
                href={filterHref({ region: undefined })}
                aria-current={!selectedRegion ? "page" : undefined}
              >
                전체
              </Link>
              {regionOptions.map((region) => (
                <Link
                  className={selectedRegion === region ? "active" : ""}
                  href={filterHref({ region })}
                  aria-current={selectedRegion === region ? "page" : undefined}
                  key={region}
                >
                  {region}
                </Link>
              ))}
            </div>
          </div>

          <div className="support-filter-group">
            <span className="support-filter-label">분야</span>
            <div className="filter-chips">
              <Link
                className={!selectedField ? "active" : ""}
                href={filterHref({ field: undefined })}
                aria-current={!selectedField ? "page" : undefined}
              >
                전체
              </Link>
              {fieldOptions.map((field) => (
                <Link
                  className={selectedField === field ? "active" : ""}
                  href={filterHref({ field })}
                  aria-current={selectedField === field ? "page" : undefined}
                  key={field}
                >
                  {field}
                </Link>
              ))}
            </div>
          </div>

          {hasFilters ? (
            <Link className="support-filter-reset" href="/support">
              필터 초기화 ↺
            </Link>
          ) : null}
        </div>

        <div className="support-result-meta" aria-live="polite">
          {hasFilters ? (
            <p>
              지원사업 <strong>{filteredPrograms.length}</strong>건
              {selectedRegion ? ` · ${selectedRegion}` : ""}
              {selectedField ? ` · ${selectedField}` : ""}
            </p>
          ) : (
            <p>전체 지원사업 {supportPrograms.length}건</p>
          )}
        </div>

        {filteredPrograms.length > 0 ? (
          <>
          <div className="support-card-grid">
            {pagePrograms.map((program) => (
              <Link
                href={`/support/${program.slug}`}
                className="support-card"
                key={program.slug}
              >
                <div className="support-card-top">
                  <span>{program.field ?? "지원사업"}</span>
                  <strong>D-{dday(program.closeAt)}</strong>
                </div>
                <h3>{program.name}</h3>
                <p className="support-card-agency">{program.agency || "기업마당"}</p>
                <p className="support-card-benefits">{program.benefits}</p>
                <div className="support-card-bottom">
                  <span>{program.region} · {program.target}</span>
                  <span>마감 {program.closeAt.slice(5).replace("-", ".")}</span>
                </div>
              </Link>
            ))}
          </div>
          {pageCount > 1 ? (
            <nav className="support-pagination" aria-label="지원사업 페이지">
              {currentPage > 1 ? <Link href={pageHref(currentPage - 1)} aria-label="이전 페이지">←</Link> : <span aria-disabled="true">←</span>}
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <Link className={page === currentPage ? "active" : ""} href={pageHref(page)} aria-current={page === currentPage ? "page" : undefined} key={page}>{page}</Link>
              ))}
              {currentPage < pageCount ? <Link href={pageHref(currentPage + 1)} aria-label="다음 페이지">→</Link> : <span aria-disabled="true">→</span>}
            </nav>
          ) : null}
          </>
        ) : (
          <div className="support-empty" role="status">
            <strong>조건에 맞는 지원사업이 아직 없어요.</strong>
            <p>다른 지역이나 분야를 선택해 다시 찾아보세요.</p>
            <Link className="button-small" href="/support">
              전체 지원사업 보기
            </Link>
          </div>
        )}
      </main>
      <Footer partners={partners} />
    </>
  );
}
