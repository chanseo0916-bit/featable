import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Public categories used by the community board. */
export const BOARD_CATEGORIES = [
  { value: "free", label: "자유", title: "자유게시판" },
  { value: "question", label: "질문", title: "질문게시판" },
  { value: "feedback", label: "피드백", title: "피드백게시판" },
  { value: "team", label: "팀 찾기", title: "팀 찾기" },
] as const;

export const BOARD_AUTHOR_VISIBILITIES = [
  {
    value: "anonymous",
    label: "익명",
    description: "다른 사용자에게 이름과 프로필을 숨겨요.",
  },
  {
    value: "profile",
    label: "프로필 공개",
    description: "프로필 이름과 이미지를 함께 보여줘요.",
  },
] as const;

export type BoardCategory = (typeof BOARD_CATEGORIES)[number]["value"];
export type BoardAuthorVisibility =
  (typeof BOARD_AUTHOR_VISIBILITIES)[number]["value"];
export const BOARD_BEST_LIKE_THRESHOLD = 10;

export function isBoardCategory(value: unknown): value is BoardCategory {
  return (
    typeof value === "string" &&
    BOARD_CATEGORIES.some((category) => category.value === value)
  );
}

export function boardCategoryLabel(value: BoardCategory): string {
  return BOARD_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

export function boardCategoryTitle(value: BoardCategory): string {
  return BOARD_CATEGORIES.find((category) => category.value === value)?.title ?? value;
}

export function isBoardAuthorVisibility(
  value: unknown,
): value is BoardAuthorVisibility {
  return (
    typeof value === "string" &&
    BOARD_AUTHOR_VISIBILITIES.some((visibility) => visibility.value === value)
  );
}

export interface BoardPostSummary {
  id: string;
  category: BoardCategory;
  title: string;
  excerpt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  authorVisibility: BoardAuthorVisibility;
}

export interface BoardPost extends BoardPostSummary {
  body: string;
  status: string;
  images: BoardPostImage[];
}

export interface BoardPostImage {
  id: string;
  url: string;
}

export interface BoardComment {
  id: string;
  postId: string;
  authorVisibility: BoardAuthorVisibility;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetBoardPostsOptions {
  category?: BoardCategory;
  unanswered?: boolean;
  best?: boolean;
}

export interface GetBoardPostsPageOptions extends GetBoardPostsOptions {
  search?: string;
  page?: number;
}

export interface BoardPostsPage {
  posts: BoardPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type DatabaseRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POST_LIMIT = 50;
const COMMENT_LIMIT = 100;
export const BOARD_POSTS_PAGE_SIZE = 12;
const BOARD_POST_SELECT =
  "id,display_name,avatar_url,author_visibility,category,title,body,status,view_count,comment_count,like_count,created_at,updated_at";
const BOARD_COMMENT_SELECT =
  "id,post_id,author_visibility,display_name,avatar_url,body,status,created_at,updated_at";

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function normalizeBoardSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function normalizePage(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10000);
}

function textValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function nullableText(value: unknown): string | null {
  const text = textValue(value).trim();
  return text ? text : null;
}

function nonNegativeInteger(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function authorName(row: DatabaseRow): string {
  const author = row.author;
  if (author && typeof author === "object") {
    const authorRow = author as DatabaseRow;
    const linkedName =
      authorRow.name ?? authorRow.full_name ?? authorRow.display_name ?? authorRow.nickname;
    if (typeof linkedName === "string" && linkedName.trim()) return linkedName.trim();
  }

  return (
    nullableText(row.author_name) ??
    nullableText(row.display_name) ??
    nullableText(row.nickname) ??
    "익명"
  );
}

function authorAvatarUrl(row: DatabaseRow): string | null {
  const author = row.author;
  if (author && typeof author === "object") {
    const authorRow = author as DatabaseRow;
    const linkedAvatar = authorRow.avatar_url ?? authorRow.avatarUrl ?? authorRow.image;
    if (typeof linkedAvatar === "string" && linkedAvatar.trim()) return linkedAvatar.trim();
  }

  return nullableText(row.author_avatar_url ?? row.avatar_url ?? row.avatarUrl);
}

function postBody(row: DatabaseRow): string {
  const value = row.body ?? row.content ?? row.description;
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function postFromRow(row: DatabaseRow): BoardPost {
  const body = postBody(row);
  const category = isBoardCategory(row.category) ? row.category : "free";
  const authorVisibility = isBoardAuthorVisibility(row.author_visibility)
    ? row.author_visibility
    : "anonymous";
  const title = textValue(row.title);
  const excerpt = textValue(row.excerpt, body.slice(0, 160));

  return {
    id: textValue(row.id),
    category,
    title,
    excerpt,
    authorName: authorVisibility === "anonymous" ? "익명" : authorName(row),
    authorAvatarUrl:
      authorVisibility === "anonymous" ? null : authorAvatarUrl(row),
    createdAt: textValue(row.created_at),
    updatedAt: textValue(row.updated_at ?? row.created_at),
    viewCount: nonNegativeInteger(row.view_count),
    commentCount: nonNegativeInteger(row.comment_count),
    likeCount: nonNegativeInteger(row.like_count),
    authorVisibility,
    body,
    status: textValue(row.status, "published"),
    images: [],
  };
}

function postSummary(post: BoardPost): BoardPostSummary {
  return {
    id: post.id,
    category: post.category,
    title: post.title,
    excerpt: post.excerpt,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    viewCount: post.viewCount,
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    authorVisibility: post.authorVisibility,
  };
}

function commentFromRow(row: DatabaseRow): BoardComment {
  const body = textValue(row.body ?? row.content ?? row.comment);
  const authorVisibility = isBoardAuthorVisibility(row.author_visibility)
    ? row.author_visibility
    : "anonymous";
  return {
    id: textValue(row.id),
    postId: textValue(row.post_id),
    authorVisibility,
    body,
    authorName: authorVisibility === "anonymous" ? "익명" : authorName(row),
    authorAvatarUrl:
      authorVisibility === "anonymous" ? null : authorAvatarUrl(row),
    createdAt: textValue(row.created_at),
    updatedAt: textValue(row.updated_at ?? row.created_at),
  };
}

export async function getBoardPostsPage(
  options: GetBoardPostsPageOptions = {},
): Promise<BoardPostsPage> {
  const page = normalizePage(options.page);
  const pageSize = BOARD_POSTS_PAGE_SIZE;
  const empty = (): BoardPostsPage => ({
    posts: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  });

  if (options.category !== undefined && !isBoardCategory(options.category)) {
    return empty();
  }

  try {
    const supabase = await createClient();
    const search = normalizeBoardSearch(options.search);
    let query = supabase
      .from("board_posts")
      .select(BOARD_POST_SELECT, { count: "exact" })
      .eq("status", "published");

    if (options.category) query = query.eq("category", options.category);
    if (options.unanswered) query = query.eq("comment_count", 0);
    if (options.best) query = query.gte("like_count", BOARD_BEST_LIKE_THRESHOLD);
    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    query = options.best
      ? query
          .order("like_count", { ascending: false })
          .order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, count, error } = await query.range(from, from + pageSize - 1);
    if (error || !data) return empty();

    const total = Math.max(0, count ?? 0);
    return {
      posts: (data as unknown as DatabaseRow[]).map(postFromRow).map(postSummary),
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
    };
  } catch {
    return empty();
  }
}

export async function getBoardPosts(
  options: GetBoardPostsOptions = {},
): Promise<BoardPostSummary[]> {
  if (options.category !== undefined && !isBoardCategory(options.category)) {
    return [];
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("board_posts")
      .select(BOARD_POST_SELECT)
      .eq("status", "published");

    if (options.category) query = query.eq("category", options.category);
    if (options.unanswered) query = query.eq("comment_count", 0);
    if (options.best) {
      query = query
        .gte("like_count", BOARD_BEST_LIKE_THRESHOLD)
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.limit(POST_LIMIT);

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as unknown as DatabaseRow[]).map(postFromRow).map(postSummary);
  } catch {
    // Treat a missing table, unavailable Supabase configuration, and transient
    // read errors alike: the board is simply empty until it can be read.
    return [];
  }
}

export async function getBoardPost(id: string): Promise<BoardPost | null> {
  if (!validUuid(id)) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("board_posts")
      .select(BOARD_POST_SELECT)
      .eq("id", id.trim())
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;

    const post = postFromRow(data as unknown as DatabaseRow);
    const { data: imageRows, error: imageError } = await supabase
      .from("board_post_images")
      .select("id,storage_path,sort_order")
      .eq("post_id", post.id)
      .order("sort_order", { ascending: true });

    if (!imageError && imageRows) {
      post.images = (imageRows as unknown as DatabaseRow[])
        .map((row) => {
          const imageId = textValue(row.id);
          const storagePath = textValue(row.storage_path);
          if (!validUuid(imageId) || !storagePath) return null;
          const url = supabase.storage
            .from("board-images")
            .getPublicUrl(storagePath).data.publicUrl;
          return url ? { id: imageId, url } : null;
        })
        .filter((image): image is BoardPostImage => image !== null);
    }

    return post;
  } catch {
    return null;
  }
}

export async function getBoardComments(postId: string): Promise<BoardComment[]> {
  if (!validUuid(postId)) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("board_comments")
      .select(BOARD_COMMENT_SELECT)
      .eq("post_id", postId.trim())
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(COMMENT_LIMIT);
    if (error || !data) return [];

    return (data as unknown as DatabaseRow[]).map(commentFromRow);
  } catch {
    return [];
  }
}
