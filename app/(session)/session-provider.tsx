import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { connection } from "next/server";
import type { ReactNode } from "react";
import ConvexClient from "./convex-client";

export async function SessionProvider({ children }: { children: ReactNode }) {
  await connection();
  // Keep the default token storage. With storage="inMemory", this Convex Auth version can't read
  // back what it saved, so its first token refresh signs the live connection out.
  // The real refresh token stays in an httpOnly cookie either way.
  return (
    <ConvexAuthNextjsServerProvider shouldHandleCode={false}>
      <ConvexClient>{children}</ConvexClient>
    </ConvexAuthNextjsServerProvider>
  );
}
