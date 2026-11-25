export async function signOutAccount(loginPath: string) {
  // Clear the cookies before navigating so the protected page does not rerender first.
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "auth:signOut", args: {} }),
  });
  if (!response.ok) throw new Error("Sign-out failed");
  window.location.replace(loginPath);
}
