import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const localEnv = resolve(root, ".env.local");
const backupEnv = resolve(root, ".env.local.deploy-backup");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const serverSecretNames = [
  "ANTHROPIC_API_KEY",
  "BIZINFO_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
  "SLACK_REVIEW_WEBHOOK_URL",
  "SLACK_SIGNING_SECRET",
  "SLACK_SIGNUP_WEBHOOK_URL",
  "SLACK_WEBHOOK_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SYNC_CRON_SECRET",
];

if (existsSync(backupEnv) && !existsSync(localEnv)) renameSync(backupEnv, localEnv);
if (existsSync(backupEnv)) throw new Error("Stale .env.local.deploy-backup exists; inspect it before deploying.");

const original = existsSync(localEnv) ? readFileSync(localEnv, "utf8") : null;
const publicEnv = (original ?? "")
  .split(/\r?\n/)
  .filter((line) => /^NEXT_PUBLIC_[A-Z0-9_]+=/.test(line.trim()))
  .map((line) => line.startsWith("NEXT_PUBLIC_SITE_URL=") ? "NEXT_PUBLIC_SITE_URL=https://featable.kr" : line)
  .join("\n");

function restore() {
  if (existsSync(localEnv)) unlinkSync(localEnv);
  if (existsSync(backupEnv)) renameSync(backupEnv, localEnv);
}

try {
  if (original !== null) renameSync(localEnv, backupEnv);
  writeFileSync(localEnv, `${publicEnv}\n`, "utf8");

  const childEnv = { ...process.env };
  for (const name of serverSecretNames) delete childEnv[name];

  for (const command of ["build", "deploy"]) {
    const result = spawnSync(npx, ["opennextjs-cloudflare", command], {
      cwd: root,
      env: childEnv,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (result.status !== 0) break;
    if (command === "build") {
      const compiledEnvPath = resolve(root, ".open-next", "cloudflare", "next-env.mjs");
      const compiledEnv = readFileSync(compiledEnvPath, "utf8");
      const leaked = serverSecretNames.filter((name) => new RegExp(`"${name}"\\s*:\\s*"[^"]+"`).test(compiledEnv));
      if (leaked.length) throw new Error(`Unsafe build: server secrets were embedded (${leaked.join(", ")}).`);
    }
  }
} finally {
  restore();
}
