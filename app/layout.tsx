import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk-config";
import { StoreProvider } from "@/lib/store/context";

export const metadata: Metadata = {
  title: "WheelDesk — the wheel doesn't end at assignment",
  description:
    "An operations desk for the wheel strategy: CSP scanner, position desk with the Trap System, and an Assignment Repair Engine.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  // Only mount ClerkProvider when keys exist; otherwise run keyless demo mode.
  return clerkEnabled ? (
    <ClerkProvider
      appearance={{ variables: { colorBackground: "#0a0a0a", colorPrimary: "#00e5ff" } }}
    >
      {children}
    </ClerkProvider>
  ) : (
    <>{children}</>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
