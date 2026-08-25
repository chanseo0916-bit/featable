import Image from "next/image";
import Link from "next/link";
import { BoardBalanceGame } from "@/components/board-balance-game";
import { BalanceShareButton } from "@/components/balance-share-button";
import { getCurrentBoardBalanceGame } from "@/lib/board-balance";
import { createPageMetadata } from "@/lib/site";
import "@/styles/balance.css";

export const metadata = createPageMetadata({
  title: "오늘의 밸런스 게임",
  description:
    "창업가라면 어떤 선택을 할까요? 로그인 없이 투표하고, Featable에서 다른 창업가들의 선택을 확인해보세요.",
  path: "/balance",
});

export default async function BalancePage() {
  const game = await getCurrentBoardBalanceGame();

  return (
    <main className="balance-page">
      <header className="balance-page-header">
        <Link href="/" className="balance-logo" aria-label="Featable 홈">
          <Image src="/featable-logo.png" alt="FEATABLE" width={2061} height={385} priority />
        </Link>
        <BalanceShareButton />
      </header>

      <section className="balance-intro" aria-labelledby="balance-page-title">
        <p className="balance-eyebrow">FEATABLE COMMUNITY</p>
        <h1 id="balance-page-title">오늘의 밸런스 게임</h1>
        <p>
          창업가라면 어떤 선택을 할까요?
          <br />
          로그인 없이 투표하고, 결과는 로그인 후 확인해보세요.
        </p>
      </section>

      {game ? (
        <div className="balance-game-wrap">
          <BoardBalanceGame game={game} />
        </div>
      ) : (
        <section className="balance-empty" aria-live="polite">
          <p className="balance-empty-label">TODAY&apos;S BALANCE</p>
          <h2>오늘의 질문을 준비하고 있어요</h2>
          <p>잠시 후 다시 방문하면 새로운 밸런스 게임을 만날 수 있어요.</p>
        </section>
      )}

      <section className="balance-guide" aria-label="밸런스 게임 이용 안내">
        <div>
          <strong>투표는 로그인 없이</strong>
          <p>가볍게 선택하고 바로 참여할 수 있어요.</p>
        </div>
        <div>
          <strong>결과는 로그인 후</strong>
          <p>다른 창업가들의 선택을 함께 확인해보세요.</p>
        </div>
      </section>

      <footer className="balance-page-footer">
        <Link href="/board">Featable 게시판 둘러보기 <span aria-hidden="true">→</span></Link>
      </footer>
    </main>
  );
}
