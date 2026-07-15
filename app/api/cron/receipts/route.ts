import { NextResponse } from "next/server";
import { cleanOperationalData, dispatchPendingDeliveries, processPushReceipts } from "@/lib/notifications/server";
import { verifyBearerSecret } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!verifyBearerSecret(request, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const receipts = await processPushReceipts();
    const retried = await dispatchPendingDeliveries();
    await cleanOperationalData();
    return NextResponse.json({ ok: true, receipts, retried });
  } catch (error) {
    console.error("Receipt cron failed", error);
    return NextResponse.json({ error: "Receipt processing failed" }, { status: 500 });
  }
}
