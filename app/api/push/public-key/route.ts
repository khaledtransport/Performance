import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/rbac";
import { canUseWebPushServer, getPublicVapidKey } from "@/lib/web-push";

export async function GET() {
  const auth = await requireApiRole(ROLES);
  if (auth.response) return auth.response;

  const key = getPublicVapidKey();
  if (!canUseWebPushServer() || !key) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }

  return NextResponse.json({ enabled: true, publicKey: key });
}
