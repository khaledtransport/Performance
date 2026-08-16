import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Bell,
  Bus,
  Calendar,
  Clock,
  FileBarChart,
  Link2,
  MapPin,
  Navigation,
  Route,
  Settings,
  Users,
} from "lucide-react";

const modules = [
  { label: "لوحة التحكم", href: "/dashboard", icon: BarChart3, description: "ملخص الرحلات والطلاب وحالة التشغيل اليومية", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { label: "تقويم الرحلات", href: "/dashboard/calendar", icon: Calendar, description: "مراجعة الرحلات حسب اليوم والأسبوع والشهر", color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  { label: "التتبع المباشر", href: "/tracking", icon: Navigation, description: "مواقع الباصات وحالة الاتصال والسرعة الحالية", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { label: "تسجيل الرحلات", href: "/delegate", icon: Clock, description: "إدخال رحلات الذهاب والعودة وأعداد الطلاب", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { label: "التقارير", href: "/reports", icon: FileBarChart, description: "مؤشرات الأداء والتفاصيل القابلة للتصدير", color: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  { label: "الباصات", href: "/admin/buses", icon: Bus, description: "إدارة الأسطول والسعة والأحياء المخدومة", color: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  { label: "السائقون", href: "/admin/drivers", icon: Users, description: "بيانات السائقين ووسائل التواصل", color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
  { label: "ربط السائقين", href: "/admin/driver-assignments", icon: Link2, description: "ربط الحسابات بالسائقين وتعيين الباصات", color: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  { label: "الجامعات", href: "/admin/universities", icon: MapPin, description: "إدارة الجامعات ووجهات النقل", color: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300" },
  { label: "الأحياء", href: "/admin/districts", icon: MapPin, description: "نطاقات التغطية الجغرافية للأسطول", color: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  { label: "المسارات", href: "/admin/routes", icon: Route, description: "ربط الجامعات بالسائقين والباصات", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  { label: "الإشعارات", href: "/admin/notifications", icon: Bell, description: "إرسال التنبيهات ومراجعة سجل الإرسال", color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Bus className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">نظام إدارة النقل الجامعي</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">مركز العمليات</h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-400">
                وصول مباشر إلى المتابعة اليومية، تسجيل الرحلات، إدارة الأسطول، والتقارير.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />لوحة التحكم</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tracking" className="gap-2"><Navigation className="h-4 w-4" />التتبع المباشر</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin" className="gap-2"><Settings className="h-4 w-4" />إعدادات النظام</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">وحدات النظام</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">الأدوات الإدارية والتشغيلية المتاحة لمدير النظام</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href} className="group focus:outline-none">
                <Card className="h-full border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors group-hover:border-blue-300 dark:group-hover:border-blue-800 group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
                  <CardHeader className="p-4 pb-2">
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${module.color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <CardTitle className="text-base text-slate-900 dark:text-slate-100">{module.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="leading-6 text-slate-500 dark:text-slate-400">{module.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
