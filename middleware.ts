import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkEnabled } from "./lib/clerk-config";

// Protect the app routes; the marketing page (/) stays public.
const isProtected = createRouteMatcher([
  "/scanner(.*)",
  "/desk(.*)",
  "/repair(.*)",
  "/settings(.*)",
]);

// When Clerk isn't configured we run keyless (demo mode) and let everything
// through — the app is fully usable without an account.
export default clerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isProtected(req)) await auth.protect();
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
