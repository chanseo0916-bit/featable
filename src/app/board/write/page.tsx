import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BoardPostForm } from "@/components/board-post-form";
import { Header } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";
import { createBoardPost } from "../actions";
import "@/styles/board.css";

export const metadata: Metadata = {
  title: "글쓰기 · 게시판",
  robots: { index: false, follow: false },
};

type WritePageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function BoardWritePage({ searchParams }: WritePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent("/board/write")}`);

  const params = await searchParams;
  const error =
    typeof params.error === "string" ? params.error.slice(0, 200) : undefined;

  return (
    <>
      <Header showChannels={false} />
      <main className="board-page-shell">
        <div className="board-page board-write-page">
          <header className="board-write-heading">
            <Link className="board-back-link" href="/board" aria-label="게시판으로 돌아가기">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m15 5-7 7 7 7" />
              </svg>
              <span className="sr-only">게시판으로 돌아가기</span>
            </Link>
            <h1>글쓰기</h1>
          </header>

          <BoardPostForm
            action={createBoardPost}
            cancelHref="/board"
            submitLabel="게시하기"
            error={error}
          />
        </div>
      </main>
    </>
  );
}
