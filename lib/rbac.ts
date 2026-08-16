export const ROLES = ["ADMIN", "MANAGER", "DELEGATE", "DRIVER", "VIEWER"] as const;

export type UserRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  MANAGER: "مدير",
  DELEGATE: "مندوب",
  DRIVER: "سائق",
  VIEWER: "مشاهد",
};

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: "/Performance",
  MANAGER: "/Performance/dashboard",
  DELEGATE: "/Performance/delegate",
  DRIVER: "/Performance/driver",
  VIEWER: "/Performance/dashboard",
};

export const ADMIN_ROLES = ["ADMIN", "MANAGER"] as const;
export const OPS_ROLES = ["ADMIN", "MANAGER", "DELEGATE"] as const;
export const VIEW_ROLES = ["ADMIN", "MANAGER", "DELEGATE", "VIEWER"] as const;
export const TRACKING_VIEW_ROLES = ["ADMIN", "MANAGER", "VIEWER"] as const;
export const DRIVER_VIEW_ROLES = ["DRIVER", "ADMIN", "MANAGER"] as const;

export type RoleRule = {
  prefix: string;
  roles: readonly UserRole[];
  methods?: readonly string[];
};

export const PAGE_ROLE_RULES: readonly RoleRule[] = [
  { prefix: "/admin", roles: ADMIN_ROLES },
  { prefix: "/test-toast", roles: ["ADMIN"] },
  { prefix: "/driver", roles: DRIVER_VIEW_ROLES },
  { prefix: "/delegate", roles: OPS_ROLES },
  { prefix: "/dashboard", roles: VIEW_ROLES },
  { prefix: "/reports", roles: ["ADMIN", "MANAGER", "VIEWER"] },
  { prefix: "/tracking", roles: TRACKING_VIEW_ROLES },
  { prefix: "/", roles: ROLES },
];

export const API_ROLE_RULES: readonly RoleRule[] = [
  { prefix: "/api/admin", roles: ADMIN_ROLES },
  { prefix: "/api/auth/register", roles: ["ADMIN"], methods: ["POST"] },
  { prefix: "/api/import", roles: ADMIN_ROLES },
  { prefix: "/api/statistics", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/trips", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/trips", roles: OPS_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/tracking/stream", roles: TRACKING_VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/tracking", roles: TRACKING_VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/tracking", roles: ["DRIVER", "ADMIN", "MANAGER"], methods: ["POST", "PATCH"] },
  { prefix: "/api/driver", roles: DRIVER_VIEW_ROLES },
  { prefix: "/api/notifications", roles: ROLES, methods: ["GET", "PUT", "DELETE"] },
  { prefix: "/api/notifications", roles: ADMIN_ROLES, methods: ["POST"] },
  { prefix: "/api/push", roles: ROLES },
  { prefix: "/api/universities", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/universities", roles: ADMIN_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/drivers", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/drivers", roles: ADMIN_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/buses", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/buses", roles: ADMIN_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/districts", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/districts", roles: ADMIN_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/representatives", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/representatives", roles: ADMIN_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/routes", roles: VIEW_ROLES, methods: ["GET"] },
  { prefix: "/api/routes", roles: ADMIN_ROLES, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { prefix: "/api/auth/me", roles: ROLES, methods: ["GET"] },
  { prefix: "/api/auth/logout", roles: ROLES, methods: ["POST"] },
];

export function isUserRole(role: string | undefined): role is UserRole {
  return Boolean(role && (ROLES as readonly string[]).includes(role));
}

export function roleHomePath(role: string | undefined): string {
  return isUserRole(role) ? ROLE_HOME[role] : "/Performance/login";
}

export function hasRole(role: string | undefined, allowed: readonly UserRole[]): boolean {
  return isUserRole(role) && allowed.includes(role);
}

export function getRequiredRoles(
  pathname: string,
  method: string,
  rules: readonly RoleRule[]
): readonly UserRole[] | null {
  const normalizedMethod = method.toUpperCase();

  for (const rule of rules) {
    const pathMatches = rule.prefix === "/"
      ? pathname === "/"
      : pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (!pathMatches) continue;
    if (rule.methods && !rule.methods.includes(normalizedMethod)) continue;
    return rule.roles;
  }

  return null;
}
