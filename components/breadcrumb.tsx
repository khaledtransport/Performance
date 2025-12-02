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
    };

    const label = labelMap[segment] || segment;
    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
};

export function Breadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  // لا تعرض breadcrumb على الصفحة الرئيسية
  if (pathname === "/") return null;

  return (
    <div
      className="bg-white/70 border-b border-slate-200 backdrop-blur-md"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
        <div className="flex items-center gap-2 text-sm md:text-base flex-wrap">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.href}>
              {index > 0 && (
                <ChevronLeft className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-slate-800 font-semibold truncate">
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  {breadcrumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
