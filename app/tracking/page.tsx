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
  Compass,
  Crosshair,
  MapPin,
  RefreshCw,
  Wifi,
  WifiOff,
  Navigation,
  Clock,
  Gauge,
} from "lucide-react";
import dynamic from "next/dynamic";
import { headingLabel } from "@/lib/tracking-geo";

// استيراد المكون ديناميكياً لتجنب مشاكل SSR
const MapComponent = dynamic(() => import("@/components/map-tracker-v4"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[58vh] min-h-90 max-h-155 w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 md:h-125">
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
  accuracy?: number | null;
  lastUpdate: string;
  lastSeenAt?: string;
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
  const [, setClock] = useState(0);

  const selectBus = useCallback((busId: string) => {
    setSelectedBus(busId);
    const url = new URL(window.location.href);
    url.searchParams.set("bus", busId);
    window.history.replaceState(null, "", url);
  }, []);

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
  useEffect(() => {
    setMounted(true);
    const busFromUrl = new URLSearchParams(window.location.search).get("bus");
    if (busFromUrl && /^[0-9a-f-]{36}$/i.test(busFromUrl)) setSelectedBus(busFromUrl);
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const formatAge = (dateStr: string) => {
    const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
    if (!Number.isFinite(ageSeconds)) return "غير معروف";
    if (ageSeconds < 5) return "الآن";
    if (ageSeconds < 60) return `منذ ${ageSeconds} ث`;
    if (ageSeconds < 3600) return `منذ ${Math.floor(ageSeconds / 60)} د`;
    return formatTime(dateStr);
  };

  const formatAccuracy = (bus: BusLocationData) => {
    if (bus.accuracy == null) return "دقة غير معروفة";
    if (bus.isCellTower || bus.accuracy >= 150) return `تقريبي ±${Math.round(bus.accuracy)} م`;
    return `±${Math.round(bus.accuracy)} م`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 md:px-8 md:py-6">
        {/* العنوان */}
        <div className="mb-4 flex flex-col items-start justify-between gap-3 md:mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-white md:text-2xl">
              <div className="rounded-lg bg-emerald-600 p-2">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              تتبع الباصات المباشر
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              متابعة مواقع الباصات على الخريطة في الوقت الفعلي
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
            <Button
              variant={mounted && autoRefresh ? "default" : "outline"}
              size="default"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="min-h-11 gap-2"
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
              size="default"
              onClick={fetchLocations}
              className="min-h-11 gap-2"
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
        <div className="mb-4 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-4 md:gap-4">
          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-3 md:p-4">
              <Bus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {locations.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-3 md:p-4">
              <Wifi className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {onlineBuses.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">متصل</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-3 md:p-4">
              <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {offlineBuses.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">غير متصل</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex items-center gap-3 p-3 md:p-4">
              <Gauge className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {onlineBuses.length > 0
                    ? Math.round(
                        onlineBuses.reduce((s, b) => s + (b.speed || 0), 0) /
                          onlineBuses.length
                      )
                    : 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  متوسط كم/س
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الخريطة وقائمة الباصات */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
          {/* الخريطة */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
              <MapComponent
                locations={locations}
                selectedBus={selectedBus}
                onSelectBus={selectBus}
              />
            </Card>
          </div>

          {/* قائمة الباصات */}
          <div className="lg:col-span-1">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bus className="w-5 h-5" />
                  الباصات ({locations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[45vh] space-y-2 overflow-y-auto pb-4 lg:max-h-125">
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
                      onClick={() => selectBus(bus.busId)}
                      className={`min-h-28 w-full rounded-lg border p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selectedBus === bus.busId
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <Badge
                          variant={bus.isOnline ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {bus.isOnline ? "متصل" : bus.hasLocation === false ? "بانتظار التتبع" : "غير متصل"}
                        </Badge>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">باص {bus.busNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {bus.district}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          {bus.speed?.toFixed(0) || 0} كم/س
                        </span>
                        <span className="flex items-center gap-1">
                          <Compass className="h-3 w-3" />
                          {headingLabel(bus.heading)}{bus.heading != null ? ` ${Math.round(bus.heading)}°` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Crosshair className="h-3 w-3" />
                          {formatAccuracy(bus)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatAge(bus.lastUpdate)}
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
