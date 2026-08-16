import nextEnv from "@next/env";
import { SignJWT } from "jose";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000/Performance";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-only-insecure-fallback-2026"
);

const roles = ["ADMIN", "MANAGER", "DELEGATE", "DRIVER", "VIEWER"];
const homes = {
  ADMIN: "/Performance",
  MANAGER: "/Performance/dashboard",
  DELEGATE: "/Performance/delegate",
  DRIVER: "/Performance/driver",
  VIEWER: "/Performance/dashboard",
};

const pages = {
  "/": roles,
  "/admin": ["ADMIN", "MANAGER"],
  "/admin/buses": ["ADMIN", "MANAGER"],
  "/admin/districts": ["ADMIN", "MANAGER"],
  "/admin/driver-assignments": ["ADMIN", "MANAGER"],
  "/admin/drivers": ["ADMIN", "MANAGER"],
  "/admin/import": ["ADMIN", "MANAGER"],
  "/admin/notifications": ["ADMIN", "MANAGER"],
  "/admin/representatives": ["ADMIN", "MANAGER"],
  "/admin/routes": ["ADMIN", "MANAGER"],
  "/admin/universities": ["ADMIN", "MANAGER"],
  "/dashboard": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/dashboard/calendar": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/delegate": ["ADMIN", "MANAGER", "DELEGATE"],
  "/driver": ["ADMIN", "MANAGER", "DRIVER"],
  "/driver/tracking": ["ADMIN", "MANAGER", "DRIVER"],
  "/reports": ["ADMIN", "MANAGER", "VIEWER"],
  "/test-toast": ["ADMIN"],
  "/tracking": ["ADMIN", "MANAGER", "VIEWER"],
};

const apis = {
  "/api/admin/driver-assignments": ["ADMIN", "MANAGER"],
  "/api/admin/drivers-users": ["ADMIN", "MANAGER"],
  "/api/auth/me": roles,
  "/api/buses": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/districts": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/driver/dashboard": ["ADMIN", "MANAGER", "DRIVER"],
  "/api/driver/my-bus": ["ADMIN", "MANAGER", "DRIVER"],
  "/api/drivers": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/notifications?limit=1": roles,
  "/api/push/public-key": roles,
  "/api/representatives": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/routes": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/statistics": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/tracking": ["ADMIN", "MANAGER", "VIEWER"],
  "/api/trips": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
  "/api/universities": ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"],
};

async function createToken(role) {
  return new SignJWT({ userId: `audit-${role.toLowerCase()}`, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

async function runLimited(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(workers);
}

let failures = 0;

for (const role of roles) {
  const token = await createToken(role);
  const headers = { cookie: `auth_token=${token}` };

  await runLimited(Object.entries(pages), 4, async ([path, allowedRoles]) => {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${path === "/" ? "" : path}`, {
      headers,
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "";
    const rootRedirect = path === "/" && role !== "ADMIN";
    const allowed = allowedRoles.includes(role) && !rootRedirect;
    const passed = allowed
      ? response.status === 200
      : response.status >= 300 && response.status < 400 && location.includes(homes[role]);
    if (!passed) failures += 1;
    console.log(`${passed ? "PASS" : "FAIL"} PAGE ${role.padEnd(8)} ${String(response.status).padEnd(3)} ${Math.round(performance.now() - started)}ms ${path}`);
  });

  await runLimited(Object.entries(apis), 3, async ([path, allowedRoles]) => {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${path}`, { headers, redirect: "manual" });
    const allowed = allowedRoles.includes(role);
    const passed = allowed
      ? response.status !== 401 && response.status !== 403 && response.status < 500
      : response.status === 403;
    if (!passed) failures += 1;
    console.log(`${passed ? "PASS" : "FAIL"} API  ${role.padEnd(8)} ${String(response.status).padEnd(3)} ${Math.round(performance.now() - started)}ms ${path}`);
  });
}

const anonymous = await fetch(`${baseUrl}/dashboard`, { redirect: "manual" });
const anonymousPassed = anonymous.status >= 300 && anonymous.status < 400 &&
  (anonymous.headers.get("location") ?? "").includes("/Performance/login");
if (!anonymousPassed) failures += 1;
console.log(`${anonymousPassed ? "PASS" : "FAIL"} PAGE ANON     ${anonymous.status} /dashboard`);

if (failures) {
  console.error(`\nRBAC audit failed: ${failures} checks`);
  process.exit(1);
}

console.log(`\nRBAC audit passed: ${roles.length * (Object.keys(pages).length + Object.keys(apis).length) + 1} checks`);
