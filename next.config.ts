import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next blocks its dev files from other addresses. Set this to open `next dev` through a tunnel.
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : undefined,
  // Browsers must always check for a newer service worker.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  experimental: {
    agentFeedback: true,
    serverActions: { bodySizeLimit: "31mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
