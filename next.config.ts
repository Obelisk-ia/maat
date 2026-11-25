import type { NextConfig } from "next";

const IMMUTABLE_STATIC = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  // Next blocks its dev files from other addresses. Set this to open `next dev` through a tunnel.
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : undefined,
  // All uploaded card images are pre-compressed to WebP <= 150 KB and static art is pre-optimized to WebP,
  // avoiding Vercel Image Optimization transformation/cache billing completely.
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      // Browsers must always check for a newer service worker.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
      { source: "/maat/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE_STATIC }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE_STATIC }] },
    ];
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
