// Clerk is optional. When no publishable key is configured the app runs in a
// keyless demo mode (no login wall) so it is usable immediately. NEXT_PUBLIC_
// vars are inlined at build time, so this is safe on both client and server.
export const clerkEnabled =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;
