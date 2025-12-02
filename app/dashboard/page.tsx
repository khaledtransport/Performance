"use client";

import { useState, useEffect } from "react";
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

export default function DashboardPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [selectedDate, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const statsRes = await fetch(
        `/Performance/api/statistics?date=${selectedDate}`
      );
      if (!statsRes.ok) throw new Error("فشل جلب الإحصائيات");
      const statsData = await statsRes.json();
      setStatistics(statsData);

      let tripsUrl = `/Performance/api/trips?date=${selectedDate}`;
      if (filterStatus !== "all") tripsUrl += `&status=${filterStatus}`;
      const tripsRes = await fetch(tripsUrl);
      if (!tripsRes.ok) throw new Error("فشل جلب الرحلات");
      const tripsData = await tripsRes.json();
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("تعذر تحميل البيانات، حاول مرة أخرى لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
      DEPARTED: "bg-blue-50 text-blue-700 border-blue-200",
      ARRIVED: "bg-green-50 text-green-700 border-green-200",
      DELAYED: "bg-orange-50 text-orange-700 border-orange-200",
      CANCELLED: "bg-red-50 text-red-700 border-red-200",
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
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      dir="rtl"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Quick Navigation */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            الوصول السريع
          </h2>
          <QuickNavigationLinks limit={5} />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-200 text-slate-900 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px] bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="فلترة حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
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
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-lg border border-slate-200 p-4 h-32 flex flex-col justify-between"
              >
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-8 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}
        {!loading && !error && (
          <>
            {/* Statistics Cards */}
            {statistics && statistics.totals && statistics.statusCounts && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-slate-500">
                      إجمالي الرحلات
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold text-blue-600">
                        {statistics.totals.totalTrips}
                      </p>
                      <Bus className="w-10 h-10 text-blue-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-slate-500">
                      إجمالي الطلاب
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold text-green-600">
                        {statistics.totals.totalStudents}
                      </p>
                      <Users className="w-10 h-10 text-green-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-slate-500">
                      الرحلات المكتملة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold text-emerald-600">
                        {statistics.statusCounts.ARRIVED}
                      </p>
                      <CheckCircle className="w-10 h-10 text-emerald-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-slate-500">
                      الرحلات المتأخرة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-bold text-orange-600">
                        {statistics.statusCounts.DELAYED}
                      </p>
                      <AlertCircle className="w-10 h-10 text-orange-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Secondary Stats */}
            {statistics &&
              statistics.driversPerformance &&
              statistics.universitiesActivity && (
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Driver Performance */}
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <TrendingUp className="w-5 h-5" />
                        أفضل السائقين أداءً
                      </CardTitle>
                      <CardDescription className="text-slate-500">
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
                                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                                    <span className="text-sm font-bold text-blue-600">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {driver.name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {driver.trips} رحلة
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="text-xl font-bold text-green-600">
                                    {driver.performancePercentage}%
                                  </p>
                                  <p className="text-xs text-slate-500">
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
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Bus className="w-5 h-5" />
                        الجامعات الأكثر نشاطاً
                      </CardTitle>
                      <CardDescription className="text-slate-500">
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
                                  <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100">
                                    <span className="text-sm font-bold text-purple-600">
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {uni.name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {uni.students} طالب
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="text-xl font-bold text-purple-600">
                                    {uni.trips}
                                  </p>
                                  <p className="text-xs text-slate-500">رحلة</p>
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
            <Card className="mt-4 bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-800">
                      تفاصيل الرحلات
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      {formatDate(new Date(selectedDate))} - {trips.length} رحلة
                    </CardDescription>
                  </div>
                  <Button
                    onClick={fetchData}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCcw
                      className={`w-4 h-4 ml-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    تحديث
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {trips.length > 0 ? (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 text-right">
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              الوقت
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              الاتجاه
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              الحي
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              السائق
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              عدد الطلاب
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              الجامعة
                            </th>
                            <th className="pb-3 pr-2 font-semibold text-slate-600">
                              الحالة
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {trips.map((trip) => (
                            <tr
                              key={trip.id}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="py-3 pr-2 text-slate-700">
                                {trip.tripTime}
                              </td>
                              <td className="py-3 pr-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    trip.direction === "GO"
                                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                                      : "bg-purple-50 text-purple-600 border border-purple-200"
                                  }`}
                                >
                                  {trip.direction === "GO" ? "ذهاب" : "عودة"}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-slate-700">
                                {trip.route?.districts?.length > 0
                                  ? trip.route.districts
                                      .map((d: any) => d.name)
                                      .join("، ")
                                  : trip.route?.district?.name ?? "-"}
                              </td>
                              <td className="py-3 pr-2 text-slate-700">
                                {trip.route?.driver?.name ?? "-"}
                              </td>
                              <td className="py-3 pr-2 text-slate-700">
                                <span className="font-semibold">
                                  {trip.studentsCount}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-slate-700">
                                {trip.route?.university?.name ?? "-"}
                              </td>
                              <td className="py-3 pr-2">
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
