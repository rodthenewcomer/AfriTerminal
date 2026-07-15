import { NextResponse } from "next/server";
import { dispatchPendingDeliveries, evaluatePriceAlerts } from "@/lib/notifications/server";
import { verifyBearerSecret } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!verifyBearerSecret(request, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const triggered = await evaluatePriceAlerts();
    const delivered = await dispatchPendingDeliveries();
    return NextResponse.json({ ok: true, triggered, delivered });
  } catch (error) {
    console.error("Alert cron failed", error);
    return NextResponse.json({ error: "Alert processing failed" }, { status: 500 });
  }
}
