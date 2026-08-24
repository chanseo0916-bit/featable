import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "auth.featable.kr" },
    ],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }],
    }];
  },
  async redirects() {
    return [
      {
        source: "/blogs",
        destination: "/stories",
        permanent: true,
      },
      {
        source: "/blogs/:slug",
        destination: "/stories/:slug",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.featable.kr" }],
        destination: "https://featable.kr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
