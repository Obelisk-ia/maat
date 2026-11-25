import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export const proxy = convexAuthNextjsMiddleware(undefined, {
  cookieConfig: { maxAge: 30 * 24 * 60 * 60 },
});

export const config = {
  matcher: ["/api/auth", "/auth", "/clientes", "/cuenta/:path*"],
};
