"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Bus,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface Statistics {
  totalTrips: number;
  totalStudents: number;
  completedTrips: number;
  pendingTrips: number;
  delayedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  driverPerformance: Array<{
    driverId: string;
    driverName: string;
    totalTrips: number;
    completedTrips: number;
    performance: number;
  }>;
  universityActivity: Array<{
    universityId: string;
    universityName: string;
    totalTrips: number;
    totalStudents: number;
  }>;
}

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  pending: "#f59e0b",
  delayed: "#ef4444",
  cancelled: "#94a3b8",
};

export default function ReportsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const fetchStatistics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/Performance/api/statistics?from=${dateRange.from}&to=${dateRange.to}`
      );
      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchStatistics();
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(() => fetchStatistics(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStatistics]);

  // تصدير التقرير كـ CSV
  const exportCSV = () => {
    if (!statistics) return;

    const BOM = "\uFEFF";
    let csv = BOM;
    csv += "تقرير نظام النقل الجامعي\n";
    csv += `التاريخ: ${dateRange.from} إلى ${dateRange.to}\n\n`;
    csv += "الملخص العام\n";
    csv += `إجمالي الرحلات,${statistics.totalTrips}\n`;
    csv += `إجمالي الطلاب,${statistics.totalStudents}\n`;
    csv += `الرحلات المكتملة,${statistics.completedTrips}\n`;
    csv += `الرحلات المتأخرة,${statistics.delayedTrips}\n`;
    csv += `الرحلات الملغاة,${statistics.cancelledTrips}\n`;
    csv += `نسبة الإنجاز,${statistics.completionRate}%\n\n`;

    csv += "أداء السائقين\n";
    csv += "اسم السائق,إجمالي الرحلات,الرحلات المكتملة,نسبة الأداء\n";
    statistics.driverPerformance?.forEach((d) => {
      csv += `${d.driverName},${d.totalTrips},${d.completedTrips},${d.performance}%\n`;
    });

    csv += "\nنشاط الجامعات\n";
    csv += "الجامعة,إجمالي الرحلات,إجمالي الطلاب\n";
    statistics.universityActivity?.forEach((u) => {
      csv += `${u.universityName},${u.totalTrips},${u.totalStudents}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تقرير_النقل_${dateRange.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // بيانات الرسوم البيانية
  const statusData = statistics
    ? [
        { name: "مكتملة", value: statistics.completedTrips, color: STATUS_COLORS.completed },
        { name: "قيد الانتظار", value: statistics.pendingTrips, color: STATUS_COLORS.pending },
        { name: "متأخرة", value: statistics.delayedTrips, color: STATUS_COLORS.delayed },
        { name: "ملغاة", value: statistics.cancelledTrips, color: STATUS_COLORS.cancelled },
      ]
    : [];

  const driverData =
    statistics?.driverPerformance?.slice(0, 8).map((d) => ({
      name: d.driverName.length > 12 ? d.driverName.slice(0, 12) + "..." : d.driverName,
      trips: d.totalTrips,
      completed: d.completedTrips,
      performance: d.performance,
    })) || [];

  const universityData =
    statistics?.universityActivity?.map((u) => ({
      name: u.universityName.length > 15 ? u.universityName.slice(0, 15) + "..." : u.universityName,
      trips: u.totalTrips,
      students: u.totalStudents,
    })) || [];

  if (loading && !statistics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* العنوان */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              التقارير والإحصائيات
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              تحليل شامل لأداء نظام النقل الجامعي
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="px-3 py-1.5 text-sm bg-transparent border-0 focus:outline-none"
              />
              <span className="text-slate-400">←</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="px-3 py-1.5 text-sm bg-transparent border-0 focus:outline-none"
              />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button variant="outline" size="sm" onClick={() => fetchStatistics(false)} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              {lastUpdated && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                  آخر تحديث: {lastUpdated.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
            <Button onClick={exportCSV} size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4" />
              تصدير CSV
            </Button>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={<Bus className="w-5 h-5" />}
            label="إجمالي الرحلات"
            value={statistics?.totalTrips || 0}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="إجمالي الطلاب"
            value={statistics?.totalStudents || 0}
            color="purple"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="مكتملة"
            value={statistics?.completedTrips || 0}
            color="green"
            badge={`${statistics?.completionRate || 0}%`}
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="قيد الانتظار"
            value={statistics?.pendingTrips || 0}
            color="amber"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="متأخرة"
            value={statistics?.delayedTrips || 0}
            color="red"
          />
          <StatCard
            icon={<XCircle className="w-5 h-5" />}
            label="ملغاة"
            value={statistics?.cancelledTrips || 0}
            color="slate"
          />
        </div>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* توزيع حالات الرحلات */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                توزيع حالات الرحلات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "عدد الرحلات"]}
                    contentStyle={{
                      direction: "rtl",
                      textAlign: "right",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: "12px" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* نسبة الإنجاز */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                نسبة الإنجاز الإجمالية
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[300px]">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200 dark:text-slate-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(statistics?.completionRate || 0) * 2.64} 264`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-slate-800 dark:text-white">
                    {statistics?.completionRate || 0}%
                  </span>
                  <span className="text-xs text-slate-500">نسبة الإنجاز</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {statistics?.completedTrips || 0} مكتملة
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 font-medium">
                    {statistics?.delayedTrips || 0} متأخرة
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الرسوم البيانية - الصف الثاني */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* أداء السائقين */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                أداء السائقين
              </CardTitle>
              <CardDescription>أفضل السائقين حسب نسبة الإنجاز</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={driverData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      direction: "rtl",
                      textAlign: "right",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "trips" ? "إجمالي" : "مكتملة",
                    ]}
                  />
                  <Bar dataKey="trips" fill="#93c5fd" name="إجمالي" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="completed" fill="#3b82f6" name="مكتملة" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* نشاط الجامعات */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                نشاط الجامعات
              </CardTitle>
              <CardDescription>عدد الرحلات والطلاب لكل جامعة</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={universityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      direction: "rtl",
                      textAlign: "right",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "trips" ? "الرحلات" : "الطلاب",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "trips" ? "الرحلات" : "الطلاب"
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="trips"
                    stroke="#3b82f6"
                    fill="#3b82f680"
                    name="trips"
                  />
                  <Area
                    type="monotone"
                    dataKey="students"
                    stroke="#8b5cf6"
                    fill="#8b5cf680"
                    name="students"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* جداول تفصيلية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ترتيب السائقين */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">ترتيب السائقين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-right py-2 px-3 font-medium text-slate-600">#</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">السائق</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">الرحلات</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">الأداء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics?.driverPerformance?.slice(0, 10).map((d, i) => (
                      <tr
                        key={d.driverId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <td className="py-2 px-3">
                          {i < 3 ? (
                            <span className="text-lg">
                              {["🥇", "🥈", "🥉"][i]}
                            </span>
                          ) : (
                            <span className="text-slate-400">{i + 1}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium">{d.driverName}</td>
                        <td className="py-2 px-3 text-center">{d.totalTrips}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            variant={
                              d.performance >= 80
                                ? "default"
                                : d.performance >= 50
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {d.performance}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ترتيب الجامعات */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">ترتيب الجامعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-right py-2 px-3 font-medium text-slate-600">#</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">الجامعة</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">الرحلات</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">الطلاب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics?.universityActivity?.map((u, i) => (
                      <tr
                        key={u.universityId}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <td className="py-2 px-3">
                          <span className="text-slate-400">{i + 1}</span>
                        </td>
                        <td className="py-2 px-3 font-medium">{u.universityName}</td>
                        <td className="py-2 px-3 text-center">{u.totalTrips}</td>
                        <td className="py-2 px-3 text-center">{u.totalStudents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// بطاقة إحصائية
function StatCard({
  icon,
  label,
  value,
  color,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  badge?: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
    green: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
    amber: "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900",
    red: "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900",
    purple: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
    slate: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700",
  };
  const textColors: Record<string, string> = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    amber: "text-amber-700 dark:text-amber-300",
    red: "text-red-700 dark:text-red-300",
    purple: "text-purple-700 dark:text-purple-300",
    slate: "text-slate-700 dark:text-slate-300",
  };
  const iconColors: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    purple: "text-purple-600 dark:text-purple-400",
    slate: "text-slate-600 dark:text-slate-400",
  };

  return (
    <Card className={`bg-linear-to-br ${colors[color]} border-0`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={iconColors[color]}>{icon}</div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <p className={`text-2xl font-bold ${textColors[color]}`}>
          {value.toLocaleString("ar-SA")}
        </p>
        <p className={`text-xs ${iconColors[color]} mt-1`}>{label}</p>
      </CardContent>
    </Card>
  );
}
