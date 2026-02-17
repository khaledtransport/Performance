"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Send,
  Users,
  User,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Bus,
  Settings,
  Clock,
  Megaphone,
  Volume2,
  VolumeX,
  CalendarClock,
  Zap,
  Shield,
  Check,
  Loader2,
  Trash2,
  ChevronDown,
  Filter,
} from "lucide-react";

interface DriverUser {
  id: string;
  fullName: string;
  username: string;
  driver?: {
    name: string;
    phone: string | null;
  } | null;
}

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  soundType: string | null;
  isRead: boolean;
  userId: string | null;
  createdAt: string;
  user?: { fullName: string } | null;
}

const NOTIFICATION_TYPES = [
  { value: "INFO", label: "معلومات", icon: Info, color: "bg-blue-100 text-blue-700 border-blue-300", bgColor: "bg-blue-500" },
  { value: "SUCCESS", label: "نجاح", icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-300", bgColor: "bg-green-500" },
  { value: "WARNING", label: "تحذير", icon: AlertTriangle, color: "bg-amber-100 text-amber-700 border-amber-300", bgColor: "bg-amber-500" },
  { value: "ERROR", label: "خطأ / طوارئ", icon: XCircle, color: "bg-red-100 text-red-700 border-red-300", bgColor: "bg-red-500" },
  { value: "URGENT", label: "عاجل", icon: Zap, color: "bg-orange-100 text-orange-700 border-orange-300", bgColor: "bg-orange-500" },
  { value: "TRIP_UPDATE", label: "تحديث رحلة", icon: Bus, color: "bg-indigo-100 text-indigo-700 border-indigo-300", bgColor: "bg-indigo-500" },
  { value: "SCHEDULE", label: "جدول", icon: CalendarClock, color: "bg-purple-100 text-purple-700 border-purple-300", bgColor: "bg-purple-500" },
  { value: "SYSTEM", label: "نظام", icon: Settings, color: "bg-slate-100 text-slate-700 border-slate-300", bgColor: "bg-slate-500" },
];

const PRIORITY_LEVELS = [
  { value: "LOW", label: "منخفضة", color: "bg-slate-100 text-slate-600" },
  { value: "NORMAL", label: "عادية", color: "bg-blue-100 text-blue-600" },
  { value: "HIGH", label: "عالية", color: "bg-amber-100 text-amber-600" },
  { value: "CRITICAL", label: "حرجة", color: "bg-red-100 text-red-600" },
];

const SOUND_TYPES = [
  { value: "default", label: "صوت افتراضي", icon: Volume2 },
  { value: "alert", label: "تنبيه قوي", icon: Megaphone },
  { value: "urgent", label: "طوارئ", icon: Zap },
  { value: "success", label: "نجاح", icon: CheckCircle2 },
  { value: "none", label: "بدون صوت", icon: VolumeX },
];

export default function AdminNotificationsPage() {
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [sentNotifications, setSentNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("INFO");
  const [priority, setPriority] = useState("NORMAL");
  const [soundType, setSoundType] = useState("default");
  const [target, setTarget] = useState<"ALL_DRIVERS" | "SELECTED_DRIVERS">("ALL_DRIVERS");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [showDriverList, setShowDriverList] = useState(false);
  const [searchDriver, setSearchDriver] = useState("");
  const [filterType, setFilterType] = useState("all");

  // جلب السائقين
  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch("/Performance/api/admin/drivers-users");
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch {
      // صامت
    }
  }, []);

  // جلب سجل الإشعارات المرسلة
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/Performance/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setSentNotifications(data.notifications || []);
      }
    } catch {
      // صامت
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
    fetchHistory();
  }, [fetchDrivers, fetchHistory]);

  // إرسال الإشعار
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setSent(false);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        soundType: soundType === "none" ? null : soundType,
        target,
      };

      if (target === "SELECTED_DRIVERS") {
        payload.driverIds = selectedDrivers;
      }

      const res = await fetch("/Performance/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSent(true);
        setSentCount(data.count || 1);
        // إعادة تعيين
        setTimeout(() => {
          setTitle("");
          setMessage("");
          setType("INFO");
          setPriority("NORMAL");
          setSoundType("default");
          setSelectedDrivers([]);
          setTarget("ALL_DRIVERS");
          setSent(false);
          fetchHistory();
        }, 3000);
      }
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const toggleDriver = (driverId: string) => {
    setSelectedDrivers((prev) =>
      prev.includes(driverId) ? prev.filter((d) => d !== driverId) : [...prev, driverId]
    );
  };

  const selectAllDrivers = () => {
    if (selectedDrivers.length === drivers.length) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(drivers.map((d) => d.id));
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.fullName.includes(searchDriver) ||
      d.username.includes(searchDriver) ||
      d.driver?.name?.includes(searchDriver) ||
      d.driver?.phone?.includes(searchDriver)
  );

  const filteredNotifications = sentNotifications.filter(
    (n) => filterType === "all" || n.type === filterType
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString("ar-SA") + " " + date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  };

  const getTypeInfo = (t: string) => NOTIFICATION_TYPES.find((nt) => nt.value === t) || NOTIFICATION_TYPES[0];

  // حذف إشعار
  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/Performance/api/notifications/${id}`, { method: "DELETE" });
      setSentNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // صامت
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">مركز الإشعارات</h1>
              <p className="text-slate-500 dark:text-slate-400">إرسال إشعارات وتنبيهات للسائقين</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ===== نموذج الإرسال ===== */}
          <div className="lg:col-span-3 space-y-6">
            {/* رسالة النجاح */}
            {sent && (
              <div className="bg-green-50 dark:bg-green-950/50 border-2 border-green-300 dark:border-green-700 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300">تم الإرسال بنجاح!</p>
                  <p className="text-sm text-green-600 dark:text-green-400">تم إرسال الإشعار إلى {sentCount} سائق</p>
                </div>
              </div>
            )}

            {/* نوع الإشعار */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  نوع التنبيه
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {NOTIFICATION_TYPES.map((nt) => {
                    const Icon = nt.icon;
                    return (
                      <button
                        key={nt.value}
                        onClick={() => setType(nt.value)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          type === nt.value
                            ? `${nt.color} border-current shadow-md scale-[1.02]`
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{nt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* محتوى الإشعار */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  محتوى الإشعار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">عنوان الإشعار *</Label>
                  <Input
                    placeholder="مثال: تغيير في جدول الرحلات..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-right text-base"
                    maxLength={100}
                  />
                  <p className="text-xs text-slate-400 mt-1">{title.length}/100</p>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">نص الرسالة *</Label>
                  <textarea
                    placeholder="اكتب تفاصيل الإشعار هنا..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full min-h-30 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-400 mt-1">{message.length}/500</p>
                </div>
              </CardContent>
            </Card>

            {/* الأولوية والصوت */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  الأولوية والصوت
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* الأولوية */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">مستوى الأولوية</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITY_LEVELS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPriority(p.value)}
                        className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          priority === p.value
                            ? `${p.color} border-current shadow-sm`
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* نوع الصوت */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">صوت التنبيه</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SOUND_TYPES.map((s) => {
                      const SIcon = s.icon;
                      return (
                        <button
                          key={s.value}
                          onClick={() => setSoundType(s.value)}
                          className={`py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all flex items-center gap-1.5 justify-center ${
                            soundType === s.value
                              ? "bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950 dark:text-blue-300 shadow-sm"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <SIcon className="w-3.5 h-3.5" />
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* زر الإرسال */}
            <Button
              onClick={handleSend}
              disabled={sending || !title.trim() || !message.trim() || (target === "SELECTED_DRIVERS" && selectedDrivers.length === 0)}
              className="w-full py-6 text-lg font-bold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 transition-all duration-300 rounded-xl"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جارٍ الإرسال...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  إرسال الإشعار
                  {target === "ALL_DRIVERS" && ` (${drivers.length} سائق)`}
                  {target === "SELECTED_DRIVERS" && selectedDrivers.length > 0 && ` (${selectedDrivers.length} سائق)`}
                </span>
              )}
            </Button>
          </div>

          {/* ===== الشريط الجانبي ===== */}
          <div className="lg:col-span-2 space-y-6">
            {/* اختيار المستلمين */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  المستلمين
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* أزرار الاختيار */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTarget("ALL_DRIVERS")}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                      target === "ALL_DRIVERS"
                        ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950 dark:border-blue-500 dark:text-blue-300"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <div className="text-right">
                      <p className="text-sm font-medium">جميع السائقين</p>
                      <p className="text-[10px] text-slate-500">{drivers.length} سائق</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setTarget("SELECTED_DRIVERS");
                      setShowDriverList(true);
                    }}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                      target === "SELECTED_DRIVERS"
                        ? "bg-purple-50 border-purple-400 text-purple-700 dark:bg-purple-950 dark:border-purple-500 dark:text-purple-300"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <div className="text-right">
                      <p className="text-sm font-medium">سائقين محددين</p>
                      <p className="text-[10px] text-slate-500">{selectedDrivers.length} مختار</p>
                    </div>
                  </button>
                </div>

                {/* قائمة السائقين */}
                {target === "SELECTED_DRIVERS" && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <Input
                        placeholder="ابحث عن سائق..."
                        value={searchDriver}
                        onChange={(e) => setSearchDriver(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                      <button
                        onClick={selectAllDrivers}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {selectedDrivers.length === drivers.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredDrivers.map((driver) => (
                        <label
                          key={driver.id}
                          className={`flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                            selectedDrivers.includes(driver.id)
                              ? "bg-blue-50/50 dark:bg-blue-950/30"
                              : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDrivers.includes(driver.id)}
                            onChange={() => toggleDriver(driver.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {driver.driver?.name || driver.fullName}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              @{driver.username} {driver.driver?.phone && `• ${driver.driver.phone}`}
                            </p>
                          </div>
                        </label>
                      ))}
                      {filteredDrivers.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-4">لا يوجد سائقين</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* معاينة الإشعار */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-500">معاينة الإشعار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-xl border-2 p-4 transition-all ${
                  getTypeInfo(type).color
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${getTypeInfo(type).bgColor} rounded-full flex items-center justify-center shrink-0`}>
                      {(() => {
                        const Icon = getTypeInfo(type).icon;
                        return <Icon className="w-5 h-5 text-white" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm">
                        {title || "عنوان الإشعار"}
                      </h4>
                      <p className="text-xs mt-1 opacity-80 line-clamp-3">
                        {message || "محتوى الرسالة سيظهر هنا..."}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] opacity-60">الآن</span>
                        {soundType !== "none" && <Volume2 className="w-3 h-3 opacity-50" />}
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {PRIORITY_LEVELS.find(p => p.value === priority)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* سجل الإشعارات المرسلة */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    آخر الإشعارات
                  </CardTitle>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800"
                  >
                    <option value="all">الكل</option>
                    {NOTIFICATION_TYPES.map((nt) => (
                      <option key={nt.value} value={nt.value}>{nt.label}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">لا توجد إشعارات</p>
                    </div>
                  ) : (
                    filteredNotifications.slice(0, 20).map((notif) => {
                      const typeInfo = getTypeInfo(notif.type);
                      const TypeIcon = typeInfo.icon;
                      return (
                        <div
                          key={notif.id}
                          className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg group"
                        >
                          <div className={`w-7 h-7 ${typeInfo.bgColor} rounded-full flex items-center justify-center shrink-0`}>
                            <TypeIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{notif.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400">{formatTime(notif.createdAt)}</span>
                              {notif.user && (
                                <span className="text-[10px] text-blue-500">← {notif.user.fullName}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
