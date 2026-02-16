import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({
      id: user.userId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
}
