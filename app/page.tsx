"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  Calendar,
  Bus,
  MapPin,
  Clock,
  TrendingUp,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const navItems: NavItem[] = [
  {
    label: "لوحة التحكم",
    href: "/dashboard/calendar",
    icon: <BarChart3 className="w-5 h-5" />,
    description: "عرض وإدارة جميع الرحلات",
    color: "from-blue-500 to-blue-600",
  },
  {
    label: "إدارة الجامعات",
    href: "/admin/universities",
    icon: <MapPin className="w-5 h-5" />,
    description: "إدارة بيانات الجامعات",
    color: "from-purple-500 to-purple-600",
  },
  {
    label: "إدارة السائقين",
    href: "/admin/drivers",
    icon: <Users className="w-5 h-5" />,
    description: "إدارة بيانات السائقين",
    color: "from-green-500 to-green-600",
  },
  {
    label: "إدارة الباصات",
    href: "/admin/buses",
    icon: <Bus className="w-5 h-5" />,
    description: "إدارة أسطول الباصات",
    color: "from-orange-500 to-orange-600",
  },
  {
    label: "إدارة المناديب",
    href: "/admin/representatives",
    icon: <Users className="w-5 h-5" />,
    description: "إدارة بيانات المناديب",
    color: "from-pink-500 to-pink-600",
  },
  {
    label: "إدارة الطرق",
    href: "/admin/routes",
    icon: <MapPin className="w-5 h-5" />,
    description: "إدارة الطرق الأساسية",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    label: "إدارة الأحياء",
    href: "/admin/districts",
    icon: <MapPin className="w-5 h-5" />,
    description: "إدارة الأحياء والمناطق",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    label: "تسجيل الرحلات",
    href: "/delegate",
    icon: <Clock className="w-5 h-5" />,
    description: "تسجيل رحلات جديدة",
    color: "from-teal-500 to-teal-600",
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen bg-slate-50"
      dir="rtl"
    >
      {/* Hero Section */}
      <section className="relative pt-20 md:pt-40 pb-20 md:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-blue-200/40 rounded-full blur-3xl -top-40 -right-40"></div>
          <div className="absolute w-96 h-96 bg-purple-200/40 rounded-full blur-3xl -bottom-40 -left-40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4 leading-tight">
                  نظام متكامل
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {" "}
                    لإدارة النقل
                  </span>
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                  تطبيق احترافي لإدارة رحلات النقل الجامعي مع تتبع فوري وتقارير
                  شاملة
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard/calendar" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg py-6 rounded-lg gap-2 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <Zap className="w-5 h-5" />
                    لوحة التحكم
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/delegate" className="flex-1">
                  <Button className="w-full bg-white hover:bg-slate-50 text-slate-700 text-lg py-6 rounded-lg border border-slate-200 transition-all duration-300 shadow-sm hover:shadow-md">
                    <Clock className="w-5 h-5" />
                    تسجيل رحلة
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200">
                <div>
                  <p className="text-3xl font-bold text-blue-600">100+</p>
                  <p className="text-sm text-slate-600">رحلة يومية</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">50+</p>
                  <p className="text-sm text-slate-600">جامعة</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-cyan-600">24/7</p>
                  <p className="text-sm text-slate-600">متابعة فورية</p>
                </div>
              </div>
            </div>

            {/* Right - Feature card */}
            <div className="relative">
              <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="space-y-6">
                  {[
                    { icon: TrendingUp, text: "تحليلات شاملة" },
                    { icon: Calendar, text: "جدولة ذكية" },
                    { icon: Zap, text: "تحديثات فورية" },
                    { icon: Users, text: "إدارة الفريق" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <item.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <span className="text-slate-700 font-medium">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Cards Section */}
      <section className="py-20 md:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              المميزات الرئيسية
            </h3>
            <p className="text-xl text-slate-600">
              جميع الأدوات التي تحتاجها في مكان واحد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {navItems.map((item, index) => (
              <Link key={index} href={item.href}>
                <Card className="group bg-white border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 cursor-pointer h-full overflow-hidden relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  ></div>

                  <CardHeader>
                    <div
                      className={`p-3 bg-gradient-to-br ${item.color} rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}
                    >
                      <span className="text-white">{item.icon}</span>
                    </div>
                    <CardTitle className="text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                      {item.label}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      {item.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center gap-2 text-blue-600 group-hover:gap-4 transition-all duration-300">
                      <span className="text-sm font-medium">انتقل الآن</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Card className="bg-white border-slate-200 overflow-hidden relative shadow-xl">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-64 h-64 bg-blue-100/50 rounded-full blur-3xl -top-20 -right-20"></div>
              <div className="absolute w-64 h-64 bg-purple-100/50 rounded-full blur-3xl -bottom-20 -left-20"></div>
            </div>

            <CardContent className="relative py-12 md:py-16 text-center">
              <h4 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                ابدأ الآن
              </h4>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                انطلق مع أسرع نظام لإدارة النقل الجامعي واستمتع بتجربة احترافية
                وسلسة
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard/calendar">
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    فتح لوحة التحكم
                  </Button>
                </Link>
                <Link href="/admin/universities">
                  <Button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-6 text-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg">
                    إدارة البيانات
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h5 className="text-slate-900 font-bold mb-4">عن النظام</h5>
              <p className="text-slate-600 text-sm">
                نظام متطور لإدارة النقل الجامعي يوفر تتبع فوري وتحليلات شاملة
              </p>
            </div>
            <div>
              <h5 className="text-slate-900 font-bold mb-4">الروابط السريعة</h5>
              <div className="space-y-2 text-sm">
                <Link
                  href="/dashboard/calendar"
                  className="text-slate-600 hover:text-blue-600 transition-colors block"
                >
                  لوحة التحكم
                </Link>
                <Link
                  href="/delegate"
                  className="text-slate-600 hover:text-blue-600 transition-colors block"
                >
                  تسجيل الرحلات
                </Link>
              </div>
            </div>
            <div>
              <h5 className="text-slate-900 font-bold mb-4">المعلومات</h5>
              <p className="text-slate-600 text-sm">
                تم التطوير باستخدام أحدث التقنيات
              </p>
              <p className="text-slate-600 text-sm mt-2">
                © 2025 جميع الحقوق محفوظة
              </p>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 text-center text-slate-500 text-sm">
            <p>نظام إدارة النقل الجامعي - Version 1.0</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
