import Link from "next/link";
import { Footer, Header } from "@/components/site-shell";
import { communities, partners } from "@/lib/mock";

export default async function CommunitiesPage({ searchParams }: { searchParams: Promise<{ field?: string; q?: string }> }) {
  const { field, q = "" } = await searchParams;
  const fields = Array.from(new Set(communities.map((community) => community.field)));
  const keyword = q.trim().toLowerCase();
  const filtered = communities.filter((community) => (!field || community.field === field) && (!keyword || `${community.name} ${community.intro} ${community.field}`.toLowerCase().includes(keyword)));

  return (
    <>
      <Header />
      <main className="community-hub">
        <div className="shell community-hub-inner">
          <header className="community-toolbar">
            <div><h1>커뮤니티 찾기</h1><span>{communities.length}개의 커뮤니티</span></div>
            <form action="/communities"><input name="q" defaultValue={q} placeholder="커뮤니티 이름이나 분야 검색" />{field && <input type="hidden" name="field" value={field} />}<button>검색</button></form>
          </header>

          <nav className="community-filters" aria-label="커뮤니티 분야">
            <Link className={!field ? "active" : ""} href={q ? `/communities?q=${encodeURIComponent(q)}` : "/communities"}>전체</Link>
            {fields.map((item) => <Link className={field === item ? "active" : ""} href={`/communities?field=${encodeURIComponent(item)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} key={item}>{item}</Link>)}
          </nav>

          <section className="community-directory-panel">
            <div className="community-panel-head">
              <div><strong>{field ? `${field} 커뮤니티` : "지금 활발한 커뮤니티"}</strong><span>검색 결과 {filtered.length}개</span></div>
              <button type="button">활동순⌄</button>
            </div>
            <div className="community-directory-list">
            {filtered.map((community, index) => (
              <Link className="community-directory-card" href={`/communities/${community.slug}`} key={community.slug}>
                <div className="community-card-head">
                  <img src={community.logoUrl} alt={`${community.name} 로고`} />
                  <span><i /> 활동 중</span>
                </div>
                <div className="community-directory-copy">
                  <div><h2>{community.name}</h2><span>{community.field}</span></div>
                  <p>{community.intro}</p>
                </div>
                <div className="community-card-stats">
                  <span><b>{128 + index * 73}</b> 멤버</span>
                  <span><b>{12 + index * 4}</b> 새 글</span>
                  <strong>커뮤니티 보기 <span aria-hidden="true">→</span></strong>
                </div>
              </Link>
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
