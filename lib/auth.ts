import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { JWT_SECRET_BYTES, TOKEN_EXPIRY } from "@/lib/jwt-config";

const JWT_SECRET = JWT_SECRET_BYTES;

const COOKIE_NAME = "auth_token";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string | null;
}

export interface JWTPayload {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  email?: string | null;
  iat?: number;
  exp?: number;
}

// تشفير كلمة المرور
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// التحقق من كلمة المرور
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// إنشاء JWT token
export async function createToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

// التحقق من التوكن
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// الحصول على المستخدم من الكوكيز
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

// تعيين كوكي المصادقة
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

// حذف كوكي المصادقة
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// التحقق من الصلاحيات
export function hasPermission(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
}

// الأدوار المتاحة مع الصلاحيات
export const ROLE_PERMISSIONS = {
  ADMIN: ["admin", "manager", "delegate", "driver", "viewer"],
  MANAGER: ["manager", "delegate", "driver", "viewer"],
  DELEGATE: ["delegate", "viewer"],
  DRIVER: ["driver", "viewer"],
  VIEWER: ["viewer"],
} as const;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "مدير",
  DELEGATE: "مندوب",
  DRIVER: "سائق",
  VIEWER: "مشاهد",
};
