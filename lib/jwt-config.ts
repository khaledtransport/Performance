/**
 * jwt-config.ts
 * =============
 * مشترك بين lib/auth.ts و middleware.ts
 * منفصل لتجنب استيراد "next/headers" في Edge runtime (middleware)
 */

// فحص إجباري — في الإنتاج يجب أن يكون المتغير موجوداً
if (typeof process !== "undefined" && process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "[FATAL] JWT_SECRET environment variable is not set.\n" +
    "Set it in Vercel: Settings → Environment Variables → JWT_SECRET\n" +
    "Example: openssl rand -base64 64"
  );
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "production" && !process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set — using insecure dev fallback. DO NOT deploy without setting this.");
}

const _secretStr = process.env.JWT_SECRET ?? "dev-only-insecure-fallback-2026";

export const JWT_SECRET_BYTES = new TextEncoder().encode(_secretStr);
export const TOKEN_EXPIRY = "7d";
