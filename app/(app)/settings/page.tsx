import { SettingsClient } from "@/components/settings/SettingsClient";
import { stripeEnabled } from "@/lib/stripe";

export default function SettingsPage() {
  return <SettingsClient stripeConfigured={stripeEnabled} />;
}
