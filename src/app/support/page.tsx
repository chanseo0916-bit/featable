import Link from "next/link";
import { Footer, Header, Badge } from "@/components/site-shell";
import { getPartners, getSupportPrograms } from "@/lib/data";

type SupportSearchParams = {
  region?: string | string[];
  field?: string | string[];
};

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

  const filterHref = (next: { region?: string; field?: string }) => {
    const params = new URLSearchParams();
    const region = "region" in next ? next.region : selectedRegion;
    const field = "field" in next ? next.field : selectedField;
    if (region) params.set("region", region);
    if (field) params.set("field", field);
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
          <div className="support-list">
            {filteredPrograms.map((program) => (
              <Link
                href={`/support/${program.slug}`}
                className="support-row"
                key={program.slug}
              >
                <div className="support-dday">
                  <strong>D-{dday(program.closeAt)}</strong>
                  <span>{program.status}</span>
                </div>
                <div className="support-main">
                  <h3>{program.name}</h3>
                  <p>
                    {program.agency} · {program.region} · {program.target}
                  </p>
                </div>
                <strong className="support-amount">{program.amount}</strong>
                <Badge tone={program.status === "마감임박" ? "orange" : "default"}>
                  {program.status}
                </Badge>
                <span className="arrow">→</span>
              </Link>
            ))}
          </div>
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
