import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, formatAdminDate } from "../../admin-ui";
import { getBoardAdminAccess } from "../access";
import { BalanceGameEditForm, BalanceGameForm } from "./balance-controls";
import type { BalanceGameInput, BalanceGameStatus } from "./actions";

export const metadata: Metadata = { title: "밸런스 게임 관리" };

type BalanceGameRow = {
  id: string; game_date: string; question: string; option_a: string; option_b: string;
  option_a_reasons: string[]; option_b_reasons: string[];
  status: BalanceGameStatus; discussion_post_id: string | null; created_at: string; updated_at: string;
};
type DiscussionRow = { id: string; title: string };
type VoteSummaryRow = {
  game_id?: unknown;
  option_a_count?: unknown;
  option_b_count?: unknown;
  total_count?: unknown;
};

const STATUS_LABELS: Record<BalanceGameStatus, string> = { draft: "초안", published: "공개", archived: "보관" };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeStatus(value: unknown): BalanceGameStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

function normalizeReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((reason): reason is string => typeof reason === "string").map((reason) => reason.trim()).filter(Boolean).slice(0, 4);
}

function normalizeGame(value: unknown): BalanceGameRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isUuid(row.id) || typeof row.game_date !== "string" || typeof row.question !== "string" || typeof row.option_a !== "string" || typeof row.option_b !== "string") return null;
  return {
    id: row.id, game_date: row.game_date, question: row.question, option_a: row.option_a, option_b: row.option_b,
    option_a_reasons: normalizeReasons(row.option_a_reasons), option_b_reasons: normalizeReasons(row.option_b_reasons),
    status: normalizeStatus(row.status), discussion_post_id: isUuid(row.discussion_post_id) ? row.discussion_post_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : row.game_date,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : row.game_date,
  };
}

function ratio(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function countValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function formatGameDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default async function AdminBoardBalancePage() {
  const access = await getBoardAdminAccess();
  if (!access.ok) {
    return <main className="admin-main shell admin-balance-page"><AdminPageHeader eyebrow="COMMUNITY" title="밸런스 게임" description="게시판 참여를 돕는 오늘의 질문을 관리합니다." /><section className="admin-list-panel admin-balance-error"><strong>관리자 권한을 확인할 수 없습니다.</strong><p>{access.error}</p></section></main>;
  }

  const { data, error } = await access.admin.from("board_balance_games").select("id,game_date,question,option_a,option_b,option_a_reasons,option_b_reasons,status,discussion_post_id,created_at,updated_at").order("game_date", { ascending: false }).limit(30);
  if (error) {
    console.error("[admin/board/balance] Failed to load games.", error);
    return <main className="admin-main shell admin-balance-page"><AdminPageHeader eyebrow="COMMUNITY" title="밸런스 게임" description="게시판 참여를 돕는 오늘의 질문을 관리합니다." /><section className="admin-list-panel admin-balance-error"><strong>밸런스 게임 테이블을 준비해야 합니다.</strong><p>배포 전 데이터베이스 마이그레이션을 적용한 뒤 다시 확인해 주세요.</p></section></main>;
  }

  const games = (data ?? []).map(normalizeGame).filter((game): game is BalanceGameRow => Boolean(game));
  const gameIds = games.map((game) => game.id);
  const postIds = games.flatMap((game) => game.discussion_post_id ? [game.discussion_post_id] : []);
  const [votesResult, postsResult] = await Promise.all([
    gameIds.length
      ? access.admin.rpc("get_board_balance_vote_summaries", { p_game_ids: gameIds })
      : Promise.resolve({ data: [], error: null }),
    postIds.length ? access.admin.from("board_posts").select("id,title").in("id", postIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (votesResult.error) console.error("[admin/board/balance] Failed to load vote counts.", votesResult.error);
  if (postsResult.error) console.error("[admin/board/balance] Failed to load discussion links.", postsResult.error);

  const votes = new Map<string, { a: number; b: number; total: number }>();
  for (const row of (votesResult.data ?? []) as VoteSummaryRow[]) {
    if (!isUuid(row.game_id)) continue;
    const a = countValue(row.option_a_count);
    const b = countValue(row.option_b_count);
    votes.set(row.game_id, { a, b, total: a + b });
  }
  const discussions = new Map(((postsResult.data ?? []) as DiscussionRow[]).filter((post) => isUuid(post.id)).map((post) => [post.id, post]));

  return (
    <main className="admin-main shell admin-balance-page">
      <AdminPageHeader eyebrow="COMMUNITY" title="밸런스 게임" description="가볍게 투표하고 이야기하게 만드는 오늘의 질문을 관리합니다." publicHref="/balance" />
      <section className="admin-list-panel admin-balance-create-panel">
        <div className="admin-balance-section-head"><div><p>DAILY ENGAGEMENT</p><h2>새 밸런스 게임 등록</h2><span>하루에 하나의 질문을 등록하고 연결 토론을 함께 엽니다.</span></div></div>
        <BalanceGameForm mode="create" />
      </section>
      <section className="admin-list-panel admin-balance-list-panel">
        <div className="admin-balance-section-head"><div><p>RECENT GAMES</p><h2>최근 밸런스 게임 <span>{games.length}</span></h2><span>투표 수와 선택 비율을 확인할 수 있습니다.</span></div></div>
        <div className="admin-balance-list">
          {games.map((game) => {
            const summary = votes.get(game.id) ?? { a: 0, b: 0, total: 0 };
            const discussion = game.discussion_post_id ? discussions.get(game.discussion_post_id) : undefined;
            const initial: BalanceGameInput = { gameDate: game.game_date.slice(0, 10), question: game.question, optionA: game.option_a, optionB: game.option_b, optionAReasons: game.option_a_reasons, optionBReasons: game.option_b_reasons, status: game.status };
            return (
              <article className="admin-balance-item" key={game.id}>
                <div className="admin-balance-item-head"><div><span className="admin-balance-date">{formatGameDate(game.game_date)}</span><span className={`admin-balance-status ${game.status}`}>{STATUS_LABELS[game.status]}</span></div><time dateTime={game.updated_at}>{formatAdminDate(game.updated_at)}</time></div>
                <h3>{game.question}</h3>
                <div className="admin-balance-options"><span>A. {game.option_a}</span><span>B. {game.option_b}</span></div>
                <div className="admin-balance-reasons" aria-label="선택지 이유 칩"><div><span>A 이유</span>{game.option_a_reasons.map((reason) => <b key={reason}>{reason}</b>)}</div><div><span>B 이유</span>{game.option_b_reasons.map((reason) => <b key={reason}>{reason}</b>)}</div></div>
                <div className="admin-balance-votes" aria-label="투표 결과"><div><span>A <strong>{summary.a.toLocaleString("ko-KR")}</strong></span><b>{ratio(summary.a, summary.total)}%</b></div><div><span>B <strong>{summary.b.toLocaleString("ko-KR")}</strong></span><b>{ratio(summary.b, summary.total)}%</b></div><div className="admin-balance-vote-total">총 {summary.total.toLocaleString("ko-KR")}표</div></div>
                <div className="admin-balance-item-foot">{discussion ? <Link href={`/board/${discussion.id}`}>토론 게시글 보기 <span aria-hidden="true">↗</span></Link> : <span className="admin-balance-unlinked">연결 토론 없음</span>}<BalanceGameEditForm id={game.id} initial={initial} contentLocked={summary.total > 0} /></div>
              </article>
            );
          })}
          {!games.length && <p className="admin-balance-empty">등록된 밸런스 게임이 없습니다. 위에서 첫 질문을 등록해 보세요.</p>}
        </div>
      </section>
    </main>
  );
}
