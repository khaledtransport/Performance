"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Clock,
  MapPin,
  Users,
  Bus,
  ArrowRight,
} from "lucide-react";

interface QuickLinkItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  description?: string;
}

const quickLinks: QuickLinkItem[] = [
  {
    label: "لوحة التحكم",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    color: "from-blue-500 to-blue-600",
    description: "عرض جميع الرحلات",
  },
  {
    label: "تسجيل رحلة",
    href: "/delegate",
    icon: <Clock className="w-5 h-5" />,
    color: "from-teal-500 to-teal-600",
    description: "إضافة رحلة جديدة",
  },
  {
    label: "إدارة الجامعات",
    href: "/admin/universities",
    icon: <MapPin className="w-5 h-5" />,
    color: "from-purple-500 to-purple-600",
    description: "بيانات الجامعات",
  },
  {
    label: "إدارة السائقين",
    href: "/admin/drivers",
    icon: <Users className="w-5 h-5" />,
    color: "from-green-500 to-green-600",
    description: "بيانات السائقين",
  },
  {
    label: "إدارة الباصات",
    href: "/admin/buses",
    icon: <Bus className="w-5 h-5" />,
    color: "from-orange-500 to-orange-600",
    description: "أسطول الباصات",
  },
];

export function QuickNavigationLinks({ limit = 5 }: { limit?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
      {quickLinks.slice(0, limit).map((link) => (
        <Link key={link.href} href={link.href}>
          <div className="group relative h-full bg-white border border-slate-200 rounded-lg p-3 md:p-4 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div
                className={`p-1.5 md:p-2 bg-gradient-to-br ${link.color} rounded text-white shadow-sm`}
              >
                {link.icon}
              </div>
              <ArrowRight className="w-3 md:w-4 h-3 md:h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-1" />
            </div>
            <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-0.5 md:mb-1 line-clamp-2">
              {link.label}
            </h3>
            {link.description && (
              <p className="text-xs text-slate-600 hidden md:block line-clamp-1">
                {link.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
