import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
