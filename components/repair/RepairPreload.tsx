"use client";

import { useSearchParams } from "next/navigation";
import { RepairEngineClient } from "./RepairEngineClient";

export function RepairPreload() {
  const params = useSearchParams();
  const csp = params.get("csp") ?? undefined;
  return <RepairEngineClient previewCsp={csp} />;
}
