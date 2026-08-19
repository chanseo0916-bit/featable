import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // 캐시 바인딩 없이 시작 (필요해지면 R2 incremental cache 추가)
});
