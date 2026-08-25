import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateBoardPost } from "@/app/board/actions";
import { BoardPostForm } from "@/components/board-post-form";
import { Header } from "@/components/site-shell";
import { getBoardPost } from "@/lib/board";
import { createClient } from "@/lib/supabase/server";
import "@/styles/board.css";

export const metadata: Metadata = {
  title: "글 수정 · 게시판",
  robots: { index: false, follow: false },
};

type BoardEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
};

function ownsPostFromPayload(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).owns_post === true,
  );
}

export default async function BoardEditPage({
  params,
  searchParams,
}: BoardEditPageProps) {
  const { id } = await params;
  const [post, supabase, query] = await Promise.all([
    getBoardPost(id),
    createClient(),
    searchParams,
  ]);

  if (!post) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/board/${post.id}/edit`)}`);
  }

  const { data: ownership, error: ownershipError } = await supabase.rpc(
    "get_my_board_ownership",
    { p_post_id: post.id },
  );
  if (ownershipError || !ownsPostFromPayload(ownership)) notFound();

  const error =
    typeof query.error === "string" ? query.error.slice(0, 200) : undefined;

  return (
    <>
      <Header showChannels={false} />
      <main className="board-page-shell">
        <div className="board-page board-write-page">
          <header className="board-write-heading">
            <Link
              className="board-back-link"
              href={`/board/${post.id}`}
              aria-label="게시글로 돌아가기"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m15 5-7 7 7 7" />
              </svg>
              <span className="sr-only">게시글로 돌아가기</span>
            </Link>
            <h1>글 수정</h1>
          </header>

          <BoardPostForm
            action={updateBoardPost}
            cancelHref={`/board/${post.id}`}
            submitLabel="수정 완료"
            postId={post.id}
            error={error}
            values={{
              authorVisibility: post.authorVisibility,
              category: post.category,
              title: post.title,
              body: post.body,
            }}
          />
        </div>
      </main>
    </>
  );
}
