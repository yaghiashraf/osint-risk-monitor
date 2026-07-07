// Server-side auth helper. Uses Clerk when configured, otherwise a stable demo
// user id so server routes work without keys.
import { clerkEnabled } from "./clerk-config";

export const DEMO_USER_ID = "demo-user";

export async function getServerUserId(): Promise<string | null> {
  if (!clerkEnabled) return DEMO_USER_ID;
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId;
}
