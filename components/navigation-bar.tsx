"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3, Menu, X, LayoutDashboard, Settings, Users, Bus,
  MapPin, Clock, Home, Calendar, Navigation, FileText,
  LogOut, Link2, Megaphone, ChevronDown, Shield,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  category?: string;
}

// قائمة السائق فقط
const driverNavigationItems: NavigationItem[] = [
  {
    label: "لوحة السائق",
    href: "/driver",
    icon: <Home className="w-4 h-4" />,
  },
  {
    label: "التتبع المباشر",
    href: "/driver/tracking",
    icon: <Navigation className="w-4 h-4" />,
  },
];

// القائمة الكاملة للإدارة
const fullNavigationItems: NavigationItem[] = [
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
    label: "تتبع الباصات",
    href: "/tracking",
    icon: <Navigation className="w-4 h-4" />,
  },
  {
    label: "التقارير",
    href: "/reports",
    icon: <FileText className="w-4 h-4" />,
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
    label: "ربط السائقين",
    href: "/admin/driver-assignments",
    icon: <Link2 className="w-4 h-4" />,
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
  {
    label: "الإشعارات",
    href: "/admin/notifications",
    icon: <Megaphone className="w-4 h-4" />,
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام", MANAGER: "مدير", DELEGATE: "مندوب", DRIVER: "سائق", VIEWER: "مشاهد",
};

export function NavigationBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const adminRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // إغلاق القوائم عند الضغط خارجها
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) setShowAdminDropdown(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUserMenu(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // إغلاق عند تغيير الصفحة
  useEffect(() => { setMobileMenuOpen(false); setShowAdminDropdown(false); }, [pathname]);

  // منع التمرير خلف القائمة الجوالة
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  if (pathname === "/login" || pathname === "/Performance/login") return null;

  // Use full nav on SSR to match server render; switch to role-based after mount
  const isDriver = mounted && user?.role === "DRIVER";
  const navigationItems = isDriver ? driverNavigationItems : fullNavigationItems;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/Performance" || pathname === "/Performance/";
    return pathname.startsWith(href) || pathname.startsWith(`/Performance${href}`);
  };

  const isAdminActive = adminItems.some((a) => isActive(a.href));

  return (
    <>
      {/* Main Navigation Bar */}
      <nav
        className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm"
        dir="rtl"
        suppressHydrationWarning
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14">
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
                    <div className="relative" ref={adminRef}>
                      <button
                        onClick={() => setShowAdminDropdown((v) => !v)}
                        className={`relative h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all ${
                          isAdminActive || showAdminDropdown
                            ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        {item.label}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdminDropdown ? "rotate-180" : ""}`} />
                        {isAdminActive && <span className="absolute bottom-0.5 right-1/2 translate-x-1/2 w-4 h-0.5 rounded-full bg-blue-500" />}
                      </button>

                      {showAdminDropdown && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-50">
                          {adminItems.map((admin) => (
                            <Link
                              key={admin.href}
                              href={admin.href}
                              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                isActive(admin.href)
                                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-500"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              {admin.icon}
                              {admin.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`relative h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all ${
                        isActive(item.href)
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                      {isActive(item.href) && <span className="absolute bottom-0.5 right-1/2 translate-x-1/2 w-4 h-0.5 rounded-full bg-blue-500" />}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Desktop Toolbar */}
            <div className="hidden md:flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
              {user && (
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.fullName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-22.5 truncate hidden lg:block">
                      {user.fullName}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                  </button>
                  {showUserMenu && (
                    <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {ROLE_LABELS[user.role] ?? user.role}
                        </p>
                      </div>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full px-4 py-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />تسجيل خروج
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* قائمة الموبايل */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={() => setMobileMenuOpen(false)} />

          <div className="md:hidden fixed top-14 right-0 left-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-xl" dir="rtl">
            {/* معلومات المستخدم */}
            {user && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {user.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{user.fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</p>
                  </div>
                </div>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950">
                  <LogOut className="w-3.5 h-3.5" />خروج
                </button>
              </div>
            )}

            <div className="px-3 py-3 space-y-0.5 max-h-[70vh] overflow-y-auto">
              {navigationItems.map((item) => (
                <div key={item.href}>
                  {item.category === "admin" ? (
                    <>
                      <button
                        onClick={() => setShowAdminDropdown((v) => !v)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isAdminActive
                            ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Shield className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-right">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAdminDropdown ? "rotate-180" : ""}`} />
                      </button>
                      {showAdminDropdown && (
                        <div className="mt-0.5 mr-4 pr-3 border-r-2 border-slate-100 dark:border-slate-700 space-y-0.5">
                          {adminItems.map((admin) => (
                            <Link key={admin.href} href={admin.href}
                              onClick={() => { setMobileMenuOpen(false); setShowAdminDropdown(false); }}
                              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer select-none ${
                                isActive(admin.href)
                                  ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {admin.icon}{admin.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link href={item.href} onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer select-none ${
                        isActive(item.href)
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.icon}{item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
