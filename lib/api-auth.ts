import { NextResponse } from "next/server";
import { getCurrentUser, JWTPayload } from "@/lib/auth";
import { hasRole, UserRole } from "@/lib/rbac";

export async function requireApiRole(
  allowedRoles: readonly UserRole[]
): Promise<{ user: JWTPayload; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "غير مصرح" }, { status: 401 }),
    };
  }

  if (!hasRole(user.role, allowedRoles)) {
    return {
      response: NextResponse.json({ error: "ليس لديك صلاحية" }, { status: 403 }),
    };
  }

  return { user };
}
