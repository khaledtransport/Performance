"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bus,
  MapPin,
  Navigation,
  Clock,
  Route,
  User,
  Phone,
  CreditCard,
  Loader2,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

interface DriverDashboardData {
  linked: boolean;
  message?: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    role: string;
  };
  driver?: {
    id: string;
    name: string;
    phone: string | null;
    licenseNumber: string | null;
  };
  assignedBus?: {
    id: string;
    busNumber: string;
    capacity: number;
    district: string;
    assignedAt: string;
    isOnline: boolean;
    lastLocation: {
      latitude: number;
      longitude: number;
      speed: number;
      timestamp: string;
    } | null;
  } | null;
  routes?: {
    id: string;
    university: string;
    district: string;
    busNumber: string;
  }[];
  stats?: {
    todayTrips: number;
    totalTrips: number;
    routesCount: number;
  };
}

export default function DriverDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/Performance/api/driver/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) fetchDashboard();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-lg text-muted-foreground">جارٍ تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // السائق غير مربوط
  if (data && !data.linked) {
    return (
      <div className="min-h-screen bg-linear-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
        <div className="max-w-md mx-auto mt-20">
          <Card className="border-2 border-amber-300">
            <CardContent className="pt-8 text-center">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">الحساب غير مربوط</h2>
              <p className="text-gray-500 mb-4">
                حسابك غير مربوط بسجل سائق في النظام.
                <br />
                تواصل مع المدير لربط حسابك.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  اسم المستخدم: <strong>{data.user.username}</strong>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  الاسم: <strong>{data.user.fullName}</strong>
                </p>
              </div>
              <Button variant="outline" onClick={logout} className="w-full">
                تسجيل خروج
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800" dir="rtl">
      {/* Header */}
      <div className="bg-linear-to-l from-blue-600 to-blue-800 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-blue-100 text-sm">مرحباً</p>
                <h1 className="text-xl font-bold">{data?.driver?.name || user?.fullName}</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              خروج
            </Button>
          </div>

          {/* بطاقة الباص */}
          {data?.assignedBus ? (
            <div className="bg-white/15 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Bus className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">باص {data.assignedBus.busNumber}</p>
                    <p className="text-blue-200 text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {data.assignedBus.district}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`${
                    data.assignedBus.isOnline
                      ? "bg-green-500/80 text-white"
                      : "bg-gray-500/80 text-white"
                  }`}
                >
                  {data.assignedBus.isOnline ? "متصل" : "غير متصل"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/20 backdrop-blur rounded-xl p-4 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-300" />
              <p className="text-amber-100">لا يوجد باص مخصص لك حالياً</p>
              <p className="text-amber-200 text-xs mt-1">تواصل مع المدير لتخصيص باص</p>
            </div>
          )}
        </div>
      </div>

      {/* المحتوى */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* زر التتبع الرئيسي */}
        <Link href="/driver/tracking">
          <Card className="border-2 border-green-400 bg-green-50 dark:bg-green-900/30 hover:shadow-lg transition-all cursor-pointer mb-4">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                    <Navigation className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                      بدء التتبع المباشر
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      شغّل GPS لإرسال موقعك للمدير
                    </p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* الإحصائيات */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {data?.stats?.todayTrips || 0}
              </p>
              <p className="text-xs text-blue-500">رحلات اليوم</p>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-0">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto text-purple-600 mb-1" />
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {data?.stats?.totalTrips || 0}
              </p>
              <p className="text-xs text-purple-500">إجمالي الرحلات</p>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-0">
            <CardContent className="p-4 text-center">
              <Route className="w-6 h-6 mx-auto text-orange-600 mb-1" />
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {data?.stats?.routesCount || 0}
              </p>
              <p className="text-xs text-orange-500">الخطوط</p>
            </CardContent>
          </Card>
        </div>

        {/* بيانات السائق */}
        {data?.driver && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                بياناتي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">الاسم</p>
                  <p className="font-medium">{data.driver.name}</p>
                </div>
              </div>
              {data.driver.phone && (
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">الجوال</p>
                    <p className="font-medium" dir="ltr">{data.driver.phone}</p>
                  </div>
                </div>
              )}
              {data.driver.licenseNumber && (
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">رقم الرخصة</p>
                    <p className="font-medium">{data.driver.licenseNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* الخطوط المخصصة */}
        {data?.routes && data.routes.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="w-5 h-5 text-blue-600" />
                خطوطي ({data.routes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.routes.map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{route.university}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {route.district}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    باص {route.busNumber}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
