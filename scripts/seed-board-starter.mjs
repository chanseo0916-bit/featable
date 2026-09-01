import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("Supabase URL or service-role secret is missing from .env.local.");
  process.exit(1);
}

const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const seeds = JSON.parse(
  readFileSync("supabase/seed/board-starter-posts.json", "utf8"),
);

function stableUuid(key) {
  const hex = createHash("sha256").update(`featable-board-starter:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function isoHoursBefore(baseTime, hours) {
  return new Date(baseTime - hours * 60 * 60 * 1000).toISOString();
}

const categories = new Set(["free", "question", "feedback", "team"]);
let invalid = false;
const seenKeys = new Set();
for (const seed of seeds) {
  if (!seed.key || seenKeys.has(seed.key)) {
    console.error("Missing or duplicate seed key:", seed.key);
    invalid = true;
  }
  seenKeys.add(seed.key);
  if (!categories.has(seed.category)) {
    console.error("Invalid category:", seed.key, seed.category);
    invalid = true;
  }
  if (!Number.isSafeInteger(seed.viewCount) || seed.viewCount < 0) {
    console.error("Invalid view count:", seed.key, seed.viewCount);
    invalid = true;
  }
  if (!Number.isSafeInteger(seed.likeCount) || seed.likeCount < 0 || seed.likeCount >= 20) {
    console.error("Invalid launch like count:", seed.key, seed.likeCount);
    invalid = true;
  }
  if (typeof seed.title !== "string" || seed.title.trim().length < 2 || seed.title.length > 120) {
    console.error("Invalid title:", seed.key);
    invalid = true;
  }
  if (typeof seed.body !== "string" || seed.body.trim().length < 1 || seed.body.length > 10000) {
    console.error("Invalid body:", seed.key);
    invalid = true;
  }
  for (const [index, comment] of (seed.comments ?? []).entries()) {
    if (typeof comment.body !== "string" || comment.body.trim().length < 1 || comment.body.length > 1000) {
      console.error("Invalid comment:", seed.key, index);
      invalid = true;
    }
    if (!(comment.afterHours > 0)) {
      console.error("Comment must follow its post:", seed.key, index);
      invalid = true;
    }
  }
}
if (invalid) process.exit(1);

const configuredAuthorId = env.BOARD_SEED_AUTHOR_ID?.trim();
let authorId = configuredAuthorId;
if (!authorId) {
  const { data: admins, error } = await db
    .from("profiles")
    .select("id,full_name,role")
    .eq("role", "admin")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Could not resolve a seed author:", error.message);
    process.exit(1);
  }
  authorId =
    admins?.find((profile) => profile.full_name === "이찬서")?.id ?? admins?.[0]?.id;
}
if (!authorId) {
  console.error("No admin profile is available. Set BOARD_SEED_AUTHOR_ID in .env.local.");
  process.exit(1);
}

const postIds = seeds.map((seed) => stableUuid(`post:${seed.key}`));
const { data: existingPosts, error: existingPostsError } = await db
  .from("board_posts")
  .select("id,view_count")
  .in("id", postIds);
if (existingPostsError) {
  console.error("Could not inspect existing starter posts:", existingPostsError.message);
  process.exit(1);
}

const existingPostIds = new Set((existingPosts ?? []).map((post) => post.id));
const existingViewCounts = new Map(
  (existingPosts ?? []).map((post) => [post.id, post.view_count ?? 0]),
);
const commentIds = seeds.flatMap((seed) =>
  (seed.comments ?? []).map((_, index) => stableUuid(`comment:${seed.key}:${index}`)),
);
const { data: existingComments, error: existingCommentsError } = await db
  .from("board_comments")
  .select("id")
  .in("id", commentIds);
if (existingCommentsError) {
  console.error("Could not inspect existing starter comments:", existingCommentsError.message);
  process.exit(1);
}
const existingCommentIds = new Set((existingComments ?? []).map((comment) => comment.id));

const { data: profiles, error: profilesError } = await db
  .from("profiles")
  .select("id")
  .neq("id", authorId);
if (profilesError) {
  console.error("Could not resolve starter likers:", profilesError.message);
  process.exit(1);
}
if ((profiles ?? []).length < Math.max(...seeds.map((seed) => seed.likeCount))) {
  console.error("Not enough distinct profiles to create launch likes.");
  process.exit(1);
}

const { data: existingLikes, error: existingLikesError } = await db
  .from("board_post_likes")
  .select("post_id,user_id")
  .in("post_id", postIds);
if (existingLikesError) {
  console.error("Could not inspect existing starter likes:", existingLikesError.message);
  process.exit(1);
}
const existingLikeKeys = new Set(
  (existingLikes ?? []).map((like) => `${like.post_id}:${like.user_id}`),
);

const baseTime = Date.now();
const seedRunStartedAt = new Date(baseTime).toISOString();
const postsToInsert = seeds
  .map((seed) => {
    const id = stableUuid(`post:${seed.key}`);
    const createdAt = isoHoursBefore(baseTime, seed.hoursAgo);
    return {
      id,
      author_id: authorId,
      author_visibility: "anonymous",
      category: seed.category,
      title: seed.title.trim(),
      body: seed.body.trim(),
      status: "published",
      view_count: seed.viewCount,
      created_at: createdAt,
      updated_at: createdAt,
    };
  })
  .filter((post) => !existingPostIds.has(post.id));

const commentsToInsert = seeds.flatMap((seed) => {
  const postId = stableUuid(`post:${seed.key}`);
  return (seed.comments ?? []).map((comment, index) => {
    const id = stableUuid(`comment:${seed.key}:${index}`);
    const createdAt = isoHoursBefore(baseTime, seed.hoursAgo - comment.afterHours);
    return {
      id,
      post_id: postId,
      author_id: authorId,
      author_visibility: "anonymous",
      body: comment.body.trim(),
      status: "published",
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
}).filter((comment) => !existingCommentIds.has(comment.id));

const likesToInsert = seeds.flatMap((seed) => {
  const postId = stableUuid(`post:${seed.key}`);
  const existingCount = (existingLikes ?? []).filter((like) => like.post_id === postId).length;
  const needed = Math.max(0, seed.likeCount - existingCount);
  if (needed === 0) return [];

  return [...(profiles ?? [])]
    .sort((a, b) => stableUuid(`${postId}:${a.id}`).localeCompare(stableUuid(`${postId}:${b.id}`)))
    .filter((profile) => !existingLikeKeys.has(`${postId}:${profile.id}`))
    .slice(0, needed)
    .map((profile, index) => ({
      post_id: postId,
      user_id: profile.id,
      created_at: isoHoursBefore(
        baseTime,
        Math.max(0.2, seed.hoursAgo - ((index + 1) * seed.hoursAgo) / (seed.likeCount + 2)),
      ),
    }));
});
const syntheticLikeActorIds = [...new Set(likesToInsert.map((like) => like.user_id))];

console.log(`validated ${seeds.length} posts and ${commentIds.length} comments`);
console.log(`new rows: ${postsToInsert.length} posts, ${commentsToInsert.length} comments, ${likesToInsert.length} likes`);
for (const seed of seeds) {
  console.log(`${String(seed.hoursAgo).padStart(5)}h  ${seed.category.padEnd(8)} ${seed.title}`);
}

if (!apply) {
  console.log("Dry run only. Pass --apply to insert missing rows.");
  process.exit(0);
}

if (postsToInsert.length > 0) {
  const { error } = await db.from("board_posts").insert(postsToInsert);
  if (error) {
    console.error("Post insert failed:", error.message);
    process.exit(1);
  }
}

let viewCountsRaised = 0;
for (const seed of seeds) {
  const id = stableUuid(`post:${seed.key}`);
  const currentCount = existingViewCounts.get(id);
  if (currentCount === undefined || currentCount >= seed.viewCount) continue;

  const { error } = await db
    .from("board_posts")
    .update({ view_count: seed.viewCount })
    .eq("id", id)
    .lt("view_count", seed.viewCount);
  if (error) {
    console.error("View-count update failed:", seed.key, error.message);
    process.exit(1);
  }
  viewCountsRaised += 1;
}

if (commentsToInsert.length > 0) {
  const { error } = await db.from("board_comments").insert(commentsToInsert);
  if (error) {
    console.error("Comment insert failed:", error.message);
    process.exit(1);
  }
}

if (likesToInsert.length > 0) {
  const { error } = await db.from("board_post_likes").insert(likesToInsert);
  if (error) {
    console.error("Like insert failed:", error.message);
    process.exit(1);
  }

  const { error: notificationCleanupError } = await db
    .from("notifications")
    .delete()
    .eq("user_id", authorId)
    .eq("data->>kind", "board_like")
    .in("data->>post_id", postIds)
    .in("actor_id", syntheticLikeActorIds)
    .gte("created_at", seedRunStartedAt);
  if (notificationCleanupError) {
    console.error("Likes were inserted, but seed notification cleanup failed:", notificationCleanupError.message);
    process.exit(1);
  }
}

const { count: publishedPostCount, error: countError } = await db
  .from("board_posts")
  .select("id", { count: "exact", head: true })
  .eq("status", "published");
if (countError) {
  console.error("Inserted rows, but final count failed:", countError.message);
  process.exit(1);
}

console.log(`raised starter view counts on ${viewCountsRaised} existing posts`);
console.log(`board now has ${publishedPostCount ?? 0} published posts`);
