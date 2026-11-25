import { fetchQuery } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";

const STORAGE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const IMMUTABLE_CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";
const NOT_FOUND_CACHE = "public, max-age=60, s-maxage=60";

export async function GET(_request: NextRequest, context: RouteContext<"/api/media/[storageId]">) {
  const { storageId } = await context.params;
  if (!STORAGE_ID_PATTERN.test(storageId)) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": NOT_FOUND_CACHE },
    });
  }

  let resolved: { url: string; contentType: string } | null = null;
  try {
    resolved = await fetchQuery(api.media.getImageUrl, { storageId });
  } catch {
    return new Response("Upstream error", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!resolved) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": NOT_FOUND_CACHE },
    });
  }

  const upstream = await fetch(resolved.url);
  if (!upstream.ok) {
    return new Response("Not Found", {
      status: upstream.status === 404 ? 404 : 502,
      headers: { "Cache-Control": upstream.status === 404 ? NOT_FOUND_CACHE : "no-store" },
    });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": resolved.contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": IMMUTABLE_CACHE,
      "CDN-Cache-Control": IMMUTABLE_CACHE,
      "Vercel-CDN-Cache-Control": IMMUTABLE_CACHE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
