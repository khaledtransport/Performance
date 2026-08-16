"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "الرئيسية", href: "/" }];

  let currentPath = "";

  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += "/" + pathSegments[i];
    const segment = pathSegments[i];

    const labelMap: Record<string, string> = {
      dashboard: "لوحة التحكم",
      delegate: "تسجيل الرحلات",
      admin: "الإدارة",
      universities: "الجامعات",
      drivers: "السائقين",
      buses: "الباصات",
      representatives: "المناديب",
      routes: "الطرق",
      districts: "الأحياء",
      calendar: "التقويم",
      tracking: "تتبع الباصات",
      reports: "التقارير",
      login: "تسجيل الدخول",
      offline: "غير متصل",
      driver: "لوحة السائق",
      "driver-assignments": "ربط السائقين",
      import: "استيراد البيانات",
      notifications: "مركز الإشعارات",
    };

    const label = labelMap[segment] || segment;
    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
};

export function Breadcrumb() {
  const pathname = usePathname();
  const cleanPath = pathname.replace(/^\/Performance/, "") || "/";
  const breadcrumbs = getBreadcrumbs(cleanPath);

  // لا تعرض breadcrumb على الصفحة الرئيسية أو تسجيل الدخول
  if (cleanPath === "/" || cleanPath === "/login" || cleanPath === "/offline") return null;

  return (
    <div
      className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5">
        <nav aria-label="مسار الصفحة" className="flex items-center gap-1.5 text-sm flex-wrap">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.href}>
              {index > 0 && (
                <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span aria-current="page" className="text-slate-800 dark:text-slate-100 font-semibold truncate">
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-medium transition-colors"
                >
                  {breadcrumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </div>
  );
}
