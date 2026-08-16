"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bus,
  MapPin,
  RefreshCw,
  Wifi,
  WifiOff,
  Navigation,
  Clock,
  Gauge,
} from "lucide-react";
import dynamic from "next/dynamic";

// استيراد المكون ديناميكياً لتجنب مشاكل SSR
const MapComponent = dynamic(() => import("@/components/map-tracker-v4"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-125 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500">جاري تحميل الخريطة...</span>
      </div>
    </div>
  ),
});

interface BusLocationData {
  busId: string;
  busNumber: string;
  district: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  lastUpdate: string;
  isOnline: boolean;
  hasLocation?: boolean;
  isCellTower?: boolean;
}

export default function TrackingPage() {
  const [locations, setLocations] = useState<BusLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  // mounted: يمنع عدم تطابق SSR ↔ client لأي حالة تعتمد على العميل فقط
  const [mounted, setMounted] = useState(false);

  // جلب يدوي (زر التحديث)
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/Performance/api/tracking?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`فشل تحميل التتبع: ${res.status}`);
      const data = await res.json();
      setLocations(data);
      setError("");
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      setError("تعذر تحميل مواقع الباصات. سيستمر النظام بمحاولة الاتصال.");
    } finally {
      setLoading(false);
    }
  }, []);

  // mounted: يُفعَّل مرة واحدة بعد أول render على الـ client
  useEffect(() => { setMounted(true); }, []);

  // SSE يرسل دفعة فورية عند الاتصال، لذلك لا نكرر طلب GET عند فتح الصفحة.
  useEffect(() => {
    if (!autoRefresh) {
      setSseConnected(false);
      return;
    }

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let receivedData = false;
    let fallbackRequested = false;

    const connect = () => {
      es = new EventSource("/Performance/api/tracking/stream");

      es.onopen = () => setSseConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          receivedData = true;
          setLocations(data);
          setError("");
          setLoading(false);
        } catch { /* تجاهل JSON غير صالح */ }
      };

      es.onerror = () => {
        setSseConnected(false);
        es?.close();
        if (!receivedData && !fallbackRequested) {
          fallbackRequested = true;
          void fetchLocations();
        }
        // إعادة الاتصال بعد ثانيتين (EventSource يعيد تلقائياً لكن نضبط التأخير)
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setSseConnected(false);
    };
  }, [autoRefresh, fetchLocations]);

  const onlineBuses = locations.filter((l) => l.isOnline);
  const offlineBuses = locations.filter((l) => !l.isOnline);

  // date-fns: format ثابت لا يتأثر بـ locale السيرفر (SSR-safe)
  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "hh:mm a", { locale: ar });
    } catch {
      return "--:--";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* العنوان */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              تتبع الباصات المباشر
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              متابعة مواقع الباصات على الخريطة في الوقت الفعلي
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={mounted && autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
              suppressHydrationWarning
            >
              <span suppressHydrationWarning className="contents">
                {mounted && autoRefresh && sseConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
              </span>
              <span suppressHydrationWarning>
                {!mounted ? "جاري التحميل..." : autoRefresh ? (sseConnected ? "مباشر" : "جاري الاتصال...") : "متوقف"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLocations}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${mounted && loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-4 text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLocations}>إعادة المحاولة</Button>
          </div>
        )}

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <Bus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {locations.length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">إجمالي</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <Wifi className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {onlineBuses.length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">متصل</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <WifiOff className="w-8 h-8 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {offlineBuses.length}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">غير متصل</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <Gauge className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {onlineBuses.length > 0
                    ? Math.round(
                        onlineBuses.reduce((s, b) => s + (b.speed || 0), 0) /
                          onlineBuses.length
                      )
                    : 0}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  متوسط السرعة
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الخريطة وقائمة الباصات */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* الخريطة */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-0 shadow-lg">
              <MapComponent
                locations={locations}
                selectedBus={selectedBus}
                onSelectBus={setSelectedBus}
              />
            </Card>
          </div>

          {/* قائمة الباصات */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bus className="w-5 h-5" />
                  الباصات ({locations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-125 overflow-y-auto">
                {locations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد باصات مسجلة</p>
                    <p className="text-xs mt-1">
                      أضف باصات من صفحة الإدارة
                    </p>
                  </div>
                ) : (
                  locations.map((bus) => (
                    <button
                      key={bus.busId}
                      onClick={() => setSelectedBus(bus.busId)}
                      className={`w-full text-right p-3 rounded-lg border transition-all duration-200 ${
                        selectedBus === bus.busId
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant={bus.isOnline ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {bus.isOnline ? "متصل" : bus.hasLocation === false ? "بانتظار التتبع" : "غير متصل"}
                        </Badge>
                        <span className="font-bold text-sm">{bus.busNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {bus.district}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          {bus.speed?.toFixed(0) || 0} كم/س
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(bus.lastUpdate)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
