"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Calendar from "react-calendar";
import {
  Calendar as CalendarIcon,
  RefreshCcw,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useTripsRange } from "../../../lib/hooks/useTripsRange";

type View = "day" | "week" | "month";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

// دالة لتحويل التاريخ المحلي إلى نص بصيغة YYYY-MM-DD
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const statusConfig = {
  PENDING: {
    label: "قيد الانتظار",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  DEPARTED: {
    label: "غادر",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Zap,
  },
  ARRIVED: {
    label: "وصل",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  DELAYED: {
    label: "متأخر",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertCircle,
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: AlertCircle,
  },
};

export default function CalendarDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeDate, setActiveDate] = useState(new Date());
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [view, setView] = useState<View>("month");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | keyof typeof statusConfig
  >("all");

  const { startDate, endDate } = useMemo(() => {
    if (view === "day") {
      const s = new Date(activeDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(activeDate);
      e.setHours(23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    if (view === "week") {
      const s = startOfWeek(activeDate);
      const e = endOfWeek(activeDate);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    const first = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
    const last = new Date(
      activeDate.getFullYear(),
      activeDate.getMonth() + 1,
      0
    );
    first.setHours(0, 0, 0, 0);
    last.setHours(23, 59, 59, 999);
    return { startDate: first.toISOString(), endDate: last.toISOString() };
  }, [activeDate, view]);

  const { dailySummary, isLoading, isValidating, refresh, trips } =
    useTripsRange({
      startDate,
      endDate,
    });

  // اختيار تلقائي لأول يوم يحتوي على رحلات
  useEffect(() => {
    if (!hasAutoSelected && dailySummary.length > 0 && !isLoading) {
      const todayStr = getLocalDateString(new Date());
      const todayHasTrips = dailySummary.find((d: any) => d.date === todayStr);

      if (todayHasTrips) {
        // اليوم الحالي يحتوي على رحلات - لا نغير شيء
        setHasAutoSelected(true);
      } else {
        // اليوم الحالي لا يحتوي على رحلات - انتقل لأقرب يوم يحتوي على رحلات
        const sortedDays = [...dailySummary].sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        if (sortedDays.length > 0) {
          // إنشاء تاريخ صحيح مع الوقت المحلي
          const targetDate = new Date(sortedDays[0].date + "T12:00:00");
          setActiveDate(targetDate);
        }
        setHasAutoSelected(true);
      }
    }
  }, [dailySummary, hasAutoSelected, isLoading]);

  const selectedDay = getLocalDateString(activeDate);
  const selectedDayData = dailySummary.find((d: any) => d.date === selectedDay);
  const todayTrips = selectedDayData?.trips || [];

  const filteredTrips = useMemo(() => {
    return todayTrips.filter((t: any) => {
      const matchesStatus =
        selectedStatus === "all" || t.status === selectedStatus;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.route?.driver?.name?.toLowerCase().includes(q) ||
        t.route?.university?.name?.toLowerCase().includes(q) ||
        t.tripTime?.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [todayTrips, selectedStatus, search]);

  // إحصائيات
  const stats = useMemo(() => {
    const all = todayTrips;
    return {
      total: all.length,
      pending: all.filter((t: any) => t.status === "PENDING").length,
      departed: all.filter((t: any) => t.status === "DEPARTED").length,
      arrived: all.filter((t: any) => t.status === "ARRIVED").length,
      delayed: all.filter((t: any) => t.status === "DELAYED").length,
      students: all.reduce(
        (sum: number, t: any) => sum + (t.studentsCount || 0),
        0
      ),
    };
  }, [todayTrips]);

  const dayWithTrips = useMemo(() => {
    return dailySummary.map((d: any) => d.date);
  }, [dailySummary]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* إحصائيات سريعة */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-900 text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  إحصائيات اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <span className="text-slate-600">إجمالي الرحلات</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {stats.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <span className="text-green-700">وصلت</span>
                    <span className="text-xl font-bold text-green-700">
                      {stats.arrived}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <span className="text-blue-700">غادرت</span>
                    <span className="text-xl font-bold text-blue-700">
                      {stats.departed}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                    <span className="text-yellow-700">قيد الانتظار</span>
                    <span className="text-xl font-bold text-yellow-700">
                      {stats.pending}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                    <span className="text-orange-700">متأخرة</span>
                    <span className="text-xl font-bold text-orange-700">
                      {stats.delayed}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                    <span className="text-purple-700">الطلاب</span>
                    <span className="text-xl font-bold text-purple-700">
                      {stats.students}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* تحكم العرض */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-900 text-sm">
                  طريقة العرض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(["day", "week", "month"] as const).map((v) => (
                  <Button
                    key={v}
                    onClick={() => setView(v)}
                    className={`w-full transition-all duration-300 ${
                      view === v
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {v === "day" ? "يوم" : v === "week" ? "أسبوع" : "شهر"}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* التقويم */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-slate-200 shadow-sm h-full">
              <CardContent className="pt-6">
                <style>{`
                  .react-calendar {
                    background: transparent;
                    border: none;
                    font-family: inherit;
                    color: #0f172a;
                    width: 100%;
                  }
                  .react-calendar__month-view__days__day {
                    padding: 12px 0;
                    border-radius: 8px;
                    transition: all 0.3s;
                    color: #334155;
                  }
                  .react-calendar__month-view__days__day:hover {
                    background: #f1f5f9;
                    transform: scale(1.05);
                  }
                  .react-calendar__tile--active {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
                    color: white !important;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                  }
                  .react-calendar__month-view__weekdays__weekday {
                    color: #64748b;
                    font-weight: 600;
                    text-decoration: none;
                  }
                  .react-calendar__navigation {
                    margin-bottom: 20px;
                  }
                  .react-calendar__navigation button {
                    color: #0f172a;
                    font-weight: bold;
                    font-size: 1.1rem;
                    transition: all 0.3s;
                  }
                  .react-calendar__navigation button:hover {
                    background-color: #f1f5f9;
                    border-radius: 8px;
                  }
                  .react-calendar__tile--now {
                    background: #eff6ff;
                    color: #2563eb;
                  }
                `}</style>
                <Calendar
                  value={activeDate}
                  onChange={(date) => setActiveDate(date as Date)}
                  formatShortWeekday={(_, date) => {
                    const days = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
                    return days[date.getDay()];
                  }}
                  tileClassName={({ date }) => {
                    const dateStr = getLocalDateString(date);
                    return dayWithTrips.includes(dateStr)
                      ? "font-bold relative after:content-[''] after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full"
                      : "";
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* فلاتر وتفاصيل */}
        <Card className="bg-white border-slate-200 shadow-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-900">
                رحلات {selectedDay}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                إجمالي الرحلات في الشهر: {trips.length} رحلة
                {dailySummary.length > 0 && ` • ${dailySummary.length} يوم`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isValidating}
              className="flex items-center gap-2"
            >
              <RefreshCcw
                className={`w-4 h-4 ${isValidating ? "animate-spin" : ""}`}
              />
              تحديث
            </Button>
          </CardHeader>
          <CardContent>
            {/* فلاتر */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <label className="text-slate-600 text-sm mb-2 block">بحث</label>
                <Input
                  placeholder="ابحث عن سائق أو جامعة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 text-sm mb-2 block">
                  الحالة
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => setSelectedStatus("all")}
                    variant="ghost"
                    className={`transition-all ${
                      selectedStatus === "all"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    الكل ({stats.total})
                  </Button>
                  {(Object.entries(statusConfig) as any[]).map(([key, cfg]) => (
                    <Button
                      key={key}
                      onClick={() => setSelectedStatus(key)}
                      variant="ghost"
                      className={`transition-all text-xs ${
                        selectedStatus === key
                          ? `${cfg.color} font-semibold`
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {cfg.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* قائمة الرحلات */}
            <div className="space-y-3 max-h-96 overflow-y-auto relative">
              {/* مؤشر التحديث في الخلفية */}
              {isValidating && !isLoading && (
                <div className="absolute top-0 left-0 right-0 z-10">
                  <div className="h-1 bg-blue-100 overflow-hidden rounded-full">
                    <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="relative inline-flex">
                    <div className="w-16 h-16 bg-blue-100 rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-slate-600 mt-4 font-medium">
                    جاري تحميل الرحلات...
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    يتم جلب {trips.length > 0 ? trips.length : ""} رحلة من
                    الخادم
                  </p>
                  <div className="mt-4 flex justify-center gap-1">
                    <div
                      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">
                    لا توجد رحلات في هذا اليوم
                  </p>
                  {dailySummary.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                      <p className="text-blue-700 text-sm font-medium mb-2">
                        💡 الأيام التي تحتوي على رحلات:
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {dailySummary.slice(0, 5).map((day: any) => (
                          <button
                            key={day.date}
                            onClick={() => setActiveDate(new Date(day.date))}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-full text-sm transition-colors"
                          >
                            {new Date(day.date).toLocaleDateString("ar-SA", {
                              day: "numeric",
                              month: "short",
                            })}
                            <span className="mr-1 text-blue-600">
                              ({day.trips.length})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {dailySummary.length === 0 &&
                    trips.length === 0 &&
                    !isLoading && (
                      <p className="text-slate-400 text-sm mt-2">
                        لا توجد رحلات مسجلة في هذا الشهر
                      </p>
                    )}
                </div>
              ) : (
                filteredTrips.map((trip: any) => {
                  const cfg =
                    statusConfig[trip.status as keyof typeof statusConfig];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={trip.id}
                      className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer transform hover:scale-102 ${cfg.color}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4" />
                            <p className="font-semibold">
                              {trip.route?.university?.name || "جامعة"}
                            </p>
                          </div>
                          <p className="text-sm opacity-75">
                            السائق: {trip.route?.driver?.name}
                          </p>
                          <p className="text-sm opacity-75">
                            الباص: {trip.route?.bus?.busNumber}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs opacity-75">
                            <span>🕐 {trip.tripTime}</span>
                            <span>👥 {trip.studentsCount || 0}</span>
                            <span>
                              {trip.direction === "GO" ? "➡️ ذهاب" : "⬅️ عودة"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold opacity-75">
                            {cfg.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm">
          <p>نظام إدارة النقل الجامعي - تحديث تلقائي</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .transform.scale-102 {
          transform: scale(1.02);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </div>
  );
}
