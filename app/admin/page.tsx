"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bus,
  Users,
  Building2,
  UserCheck,
  Route,
  Upload,
  ArrowLeft,
  MapPin,
} from "lucide-react";

export default function AdminPage() {
  const adminSections = [
    {
      title: "إدارة الجامعات",
      description: "إضافة وتعديل وحذف الجامعات",
      icon: Building2,
      href: "/admin/universities",
      color: "blue",
    },
    {
      title: "إدارة السائقين",
      description: "إضافة وتعديل معلومات السائقين",
      icon: UserCheck,
      href: "/admin/drivers",
      color: "green",
    },
    {
      title: "إدارة الباصات",
      description: "إضافة وتعديل بيانات الباصات",
      icon: Bus,
      href: "/admin/buses",
      color: "purple",
    },
    {
      title: "إدارة المناديب",
      description: "إضافة وتعديل معلومات المناديب",
      icon: Users,
      href: "/admin/representatives",
      color: "orange",
    },
    {
      title: "إدارة الرحلات",
      description: "إنشاء وتعديل الرحلات الأساسية",
      icon: Route,
      href: "/admin/routes",
      color: "pink",
    },
    {
      title: "استيراد من Excel",
      description: "رفع ملف Excel وتحويله تلقائياً",
      icon: Upload,
      href: "/admin/import",
      color: "indigo",
    },
    {
      title: "إدارة الأحياء",
      description: "إضافة وتعديل وحذف الأحياء",
      icon: MapPin,
      href: "/admin/districts",
      color: "red",
    },
  ];

  const colorClasses: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    pink: "bg-pink-50 text-pink-600 border-pink-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              لوحة الإدارة
            </h1>
            <p className="text-slate-600">إدارة جميع عناصر النظام</p>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              الرئيسية
            </Button>
          </Link>
        </div>

        {/* Admin Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="bg-white border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer h-full group">
                  <CardHeader>
                    <div
                      className={`w-14 h-14 rounded-lg ${
                        colorClasses[section.color]
                      } border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-xl text-slate-800 group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200">
                      فتح
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Access */}
        <div className="mt-12 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            روابط سريعة
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/dashboard">
              <Card className="bg-white border-slate-200 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <Bus className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        لوحة التحكم
                      </p>
                      <p className="text-sm text-slate-500">
                        عرض الإحصائيات والرحلات
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/delegate">
              <Card className="bg-white border-slate-200 hover:border-green-200 hover:shadow-md cursor-pointer transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                      <UserCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        واجهة المندوب
                      </p>
                      <p className="text-sm text-slate-500">تسجيل الرحلات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
