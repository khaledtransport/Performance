import { NextResponse } from "next/server";
import { canUseWebPushServer, getPublicVapidKey } from "@/lib/web-push";

export async function GET() {
  const key = getPublicVapidKey();
  if (!canUseWebPushServer() || !key) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  return NextResponse.json({ publicKey: key });
}
