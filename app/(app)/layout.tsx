import { AppShell } from "@/components/AppShell";

// Wraps the authenticated app screens (Desk, Scanner, Repair, Settings) in the
// nav shell. Route protection is handled by middleware when Clerk is enabled.
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
