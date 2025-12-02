import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // basePath is now handled by next.config.js
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
