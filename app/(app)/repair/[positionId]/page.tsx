import { RepairEngineClient } from "@/components/repair/RepairEngineClient";

export default async function RepairPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;
  return <RepairEngineClient lotId={positionId} />;
}
