"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bus,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { QuickNavigationLinks } from "@/components/quick-navigation";
import { MobileTripCard } from "@/components/mobile-trip-card";
import { ShiftSchedule } from "@/components/dashboard/shift-schedule";
import { Statistics, Trip } from "@/components/dashboard/types";

interface TrackingNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  priority?: string;
}

export default function DashboardPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trackingNotifications, setTrackingNotifications] = useState<TrackingNotification[]>([]);
  const requestController = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    if (!silent) setLoading(true);
    setError("");
    try {
      let tripsUrl = `/Performance/api/trips?date=${selectedDate}`;
      if (filterStatus !== "all") tripsUrl += `&status=${filterStatus}`;

      const notificationsRequest = fetch("/Performance/api/notifications?limit=30", {
        signal: controller.signal,
      });
      const [statsRes, tripsRes] = await Promise.all([
        fetch(`/Performance/api/statistics?date=${selectedDate}`, { signal: controller.signal }),
        fetch(tripsUrl, { signal: controller.signal }),
      ]);

      if (!statsRes.ok || !tripsRes.ok) {
        throw new Error("فشل جلب بيانات لوحة التحكم");
      }

      const [statsData, tripsData] = await Promise.all([
        statsRes.json(),
        tripsRes.json(),
      ]);
      setStatistics(statsData);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setLastUpdated(new Date());

      void notificationsRequest.then(async (notifRes) => {
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          const list = Array.isArray(notifData.notifications) ? notifData.notifications : [];
          const trackingOnly = list
            .filter((n: any) => n?.title === "بدء تتبع السائق" || n?.title === "إيقاف تتبع السائق")
            .slice(0, 6)
            .map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              createdAt: n.createdAt,
              priority: n.priority,
            }));
          setTrackingNotifications(trackingOnly);
        }
      }).catch(() => {
        // الإشعارات ثانوية ولا تؤخر بيانات لوحة التحكم.
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Error fetching data:", error);
      setError("تعذر تحميل البيانات، حاول مرة أخرى لاحقاً");
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        if (!silent) setLoading(false);
      }
    }
  }, [selectedDate, filterStatus]);

  useEffect(() => {
    fetchData();
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(() => fetchData(true), 30000);
    return () => {
      clearInterval(interval);
      requestController.current?.abort();
    };
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      DEPARTED: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      ARRIVED: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      DELAYED: "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      CANCELLED: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    };
    const labels = {
      PENDING: "قيد الانتظار",
      DEPARTED: "غادر",
      ARRIVED: "وصل",
      DELAYED: "متأخر",
      CANCELLED: "ملغي",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${
          styles[status as keyof typeof styles] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300"
      dir="rtl"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Quick Navigation */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            الوصول السريع
          </h2>
          <QuickNavigationLinks limit={5} />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-2xs"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-50 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl">
              <SelectValue placeholder="فلترة حسب الحالة" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="PENDING">قيد الانتظار</SelectItem>
              <SelectItem value="DEPARTED">غادر</SelectItem>
              <SelectItem value="ARRIVED">وصل</SelectItem>
              <SelectItem value="DELAYED">متأخر</SelectItem>
              <SelectItem value="CANCELLED">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* حالات التحميل والخطأ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 h-32 flex flex-col justify-between"
              >
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}
        {!loading && !error && (
          <>
            {/* Statistics Cards */}
            {statistics && statistics.totals && statistics.statusCounts && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                      إجمالي الرحلات
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">
                        {statistics.totals.totalTrips}
                      </p>
                      <Bus className="w-9 h-9 text-blue-600 dark:text-blue-400 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                      إجمالي الطلاب
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                        {statistics.totals.totalStudents}
                      </p>
                      <Users className="w-9 h-9 text-emerald-600 dark:text-emerald-400 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                      الرحلات المكتملة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl sm:text-4xl font-black text-teal-600 dark:text-teal-400">
                        {statistics.statusCounts.ARRIVED}
                      </p>
                      <CheckCircle className="w-9 h-9 text-teal-600 dark:text-teal-400 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                      الرحلات المتأخرة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl sm:text-4xl font-black text-orange-600 dark:text-orange-400">
                        {statistics.statusCounts.DELAYED}
                      </p>
                      <AlertCircle className="w-9 h-9 text-orange-600 dark:text-orange-400 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                  <Bus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  حالات التتبع المباشر للسائقين
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  آخر عمليات بدء/إيقاف التتبع مع معلومات السائق
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trackingNotifications.length > 0 ? (
                  <div className="space-y-3">
                    {trackingNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`rounded-xl border p-4 ${
                          notification.title.includes("إيقاف")
                            ? "border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40"
                            : "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p
                            className={`font-bold text-sm ${
                              notification.title.includes("إيقاف")
                                ? "text-amber-800 dark:text-amber-300"
                                : "text-emerald-800 dark:text-emerald-300"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(notification.createdAt).toLocaleString("ar-SA")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-6">
                          {notification.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 dark:text-slate-400">لا توجد أحداث تتبع حديثة</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Secondary Stats */}
            {statistics &&
              statistics.driversPerformance &&
              statistics.universitiesActivity && (
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Driver Performance */}
                  <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        أفضل السائقين أداءً
                      </CardTitle>
                      <CardDescription className="text-slate-500 dark:text-slate-400">
                        حسب نسبة الالتزام بالمواعيد
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {statistics.driversPerformance &&
                      statistics.driversPerformance.length > 0 ? (
                        <div className="space-y-4">
                          {statistics.driversPerformance.map(
                            (driver: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/80 rounded-full flex items-center justify-center border border-blue-100 dark:border-blue-800">
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                      {driver.name}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      {driver.trips} رحلة
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {driver.performancePercentage}%
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    نسبة الالتزام
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">
                          لا توجد بيانات
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* University Activity */}
                  <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                        <Bus className="w-5 h-5 text-purple-500" />
                        الجامعات الأكثر نشاطاً
                      </CardTitle>
                      <CardDescription className="text-slate-500 dark:text-slate-400">
                        حسب عدد الرحلات والطلاب
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {statistics.universitiesActivity &&
                      statistics.universitiesActivity.length > 0 ? (
                        <div className="space-y-4">
                          {statistics.universitiesActivity.map(
                            (uni: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-50 dark:bg-purple-950/80 rounded-full flex items-center justify-center border border-purple-100 dark:border-purple-800">
                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                      {uni.name}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      {uni.students} طالب
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                    {uni.trips}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">رحلة</p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">
                          لا توجد بيانات
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

            {/* Shift Schedule (Horizontal) */}
            <div className="mt-8 mb-8">
              <ShiftSchedule trips={trips} />
            </div>

            {/* Trips List (Detailed Table) */}
            <Card className="mt-4 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-800 dark:text-white">
                      تفاصيل الرحلات
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      {formatDate(new Date(selectedDate))} - {trips.length} رحلة
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      onClick={() => fetchData(false)}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl"
                    >
                      <RefreshCcw
                        className={`w-4 h-4 ml-2 ${
                          loading ? "animate-spin" : ""
                        }`}
                      />
                      تحديث
                    </Button>
                    {lastUpdated && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                        آخر تحديث: {lastUpdated.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {trips.length > 0 ? (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-right">
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              الوقت
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              الاتجاه
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              الحي
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              السائق
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              عدد الطلاب
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              الجامعة
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600 dark:text-slate-400">
                              الحالة
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {trips.map((trip) => (
                            <tr
                              key={trip.id}
                              className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3.5 pr-2 font-mono text-sm text-slate-700 dark:text-slate-300">
                                {trip.tripTime}
                              </td>
                              <td className="py-3.5 pr-2">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                    trip.direction === "GO"
                                      ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                      : "bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                  }`}
                                >
                                  {trip.direction === "GO" ? "ذهاب" : "عودة"}
                                </span>
                              </td>
                              <td className="py-3.5 pr-2 text-slate-700 dark:text-slate-300 font-medium">
                                {(trip.route?.districts?.length ?? 0) > 0
                                  ? (trip.route?.districts ?? [])
                                      .map((d: { name: string }) => d.name)
                                      .join("، ")
                                  : trip.route?.district?.name ?? "-"}
                              </td>
                              <td className="py-3.5 pr-2 text-slate-700 dark:text-slate-300">
                                {trip.route?.driver?.name ?? "-"}
                              </td>
                              <td className="py-3.5 pr-2 text-slate-700 dark:text-slate-300">
                                <span className="font-bold">
                                  {trip.studentsCount}
                                </span>
                              </td>
                              <td className="py-3.5 pr-2 text-slate-700 dark:text-slate-300">
                                {trip.route?.university?.name ?? "-"}
                              </td>
                              <td className="py-3.5 pr-2">
                                {getStatusBadge(trip.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                      {trips.map((trip) => (
                        <MobileTripCard
                          key={trip.id}
                          trip={trip}
                          getStatusBadge={getStatusBadge}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      لا توجد رحلات في هذا التاريخ
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
