"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  Users,
  Bus,
  MapPin,
  Clock,
  Home,
  Calendar,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  category?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: "الرئيسية",
    href: "/",
    icon: <Home className="w-4 h-4" />,
  },
  {
    label: "لوحة التحكم",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    category: "dashboard",
  },
  {
    label: "التقويم",
    href: "/dashboard/calendar",
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    label: "تسجيل الرحلات",
    href: "/delegate",
    icon: <Clock className="w-4 h-4" />,
  },
  {
    label: "الإدارة",
    href: "/admin",
    icon: <Settings className="w-4 h-4" />,
    category: "admin",
  },
];

const adminItems: NavigationItem[] = [
  {
    label: "الجامعات",
    href: "/admin/universities",
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    label: "السائقين",
    href: "/admin/drivers",
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: "الباصات",
    href: "/admin/buses",
    icon: <Bus className="w-4 h-4" />,
  },
  {
    label: "المناديب",
    href: "/admin/representatives",
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: "الطرق",
    href: "/admin/routes",
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    label: "الأحياء",
    href: "/admin/districts",
    icon: <MapPin className="w-4 h-4" />,
  },
];

export function NavigationBar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <nav
        className={`sticky top-0 z-40 transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm`}
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-800 hidden sm:inline">
                النقل الجامعي
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => (
                <div key={item.href}>
                  {item.category === "admin" ? (
                    <div className="relative group">
                      <button
                        onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                          showAdminDropdown ||
                          adminItems.some((admin) =>
                            pathname.startsWith(admin.href)
                          )
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                        }`}
                      >
                        {item.icon}
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            showAdminDropdown ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-56 bg-white backdrop-blur-md border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 py-2">
                        {adminItems.map((admin) => (
                          <Link
                            key={admin.href}
                            href={admin.href}
                            className={`px-4 py-2 flex items-center gap-3 transition-all duration-300 ${
                              isActive(admin.href)
                                ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            }`}
                          >
                            {admin.icon}
                            <span className="text-sm font-medium">
                              {admin.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                      }`}
                    >
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 fixed top-16 left-0 right-0 z-30"
          dir="rtl"
        >
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {navigationItems.map((item) => (
              <div key={item.href}>
                {item.category === "admin" ? (
                  <>
                    <button
                      onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                      className="w-full px-4 py-2 rounded-lg flex items-center gap-2 text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      {item.icon}
                      <span className="text-sm font-medium flex-1 text-right">
                        {item.label}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          showAdminDropdown ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </button>
                    {showAdminDropdown && (
                      <div className="pl-4 space-y-1 mt-1">
                        {adminItems.map((admin) => (
                          <Link
                            key={admin.href}
                            href={admin.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block px-4 py-2 rounded-lg text-sm transition-all ${
                              isActive(admin.href)
                                ? "bg-blue-50 text-blue-600"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {admin.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
