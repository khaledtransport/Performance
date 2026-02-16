"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Navigation,
  MapPin,
  Power,
  PowerOff,
  Gauge,
  Compass,
  Clock,
  Bus,
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

interface BusOption {
  id: string;
  busNumber: string;
  district: string;
}

interface DriverInfo {
  id: string;
  name: string;
}

interface FullPosition {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
}

// حساب المسافة بين نقطتين باستخدام صيغة Haversine (بالمتر)
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // نصف قطر الأرض بالمتر
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DriverTrackingPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // حالة التتبع
  const [isTracking, setIsTracking] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [assignedBus, setAssignedBus] = useState<BusOption | null>(null);
  const [availableBuses, setAvailableBuses] = useState<BusOption[]>([]);
  const [loadingBus, setLoadingBus] = useState(true);

  // بيانات GPS
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0); // المسافة الكلية بالمتر
  const [calculatedSpeed, setCalculatedSpeed] = useState<number | null>(null); // سرعة محسوبة كم/س
  const [permissionStatus, setPermissionStatus] = useState<string>("checking");
  // "checking" | "granted" | "denied" | "prompt" | "unsupported"
  const [gpsQuality, setGpsQuality] = useState<"excellent" | "good" | "poor" | "cell-tower" | "unknown">("unknown");
  // excellent: <20m, good: <100m, poor: <300m, cell-tower: >=300m

  // المراجع
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const firstPositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef<FullPosition | null>(null);
  const bestPositionRef = useRef<FullPosition | null>(null);
  const prevGpsPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const calculatedSpeedRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const selectedBusIdRef = useRef<string>("");
  const gpsRetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getPendingStopKey = useCallback((busId: string) => `tracking_pending_stop:${busId}`, []);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    selectedBusIdRef.current = selectedBusId;
  }, [selectedBusId]);

  // فحص إذن الموقع عند التحميل + طلب تلقائي
  useEffect(() => {
    // التحقق من أن السياق آمن (HTTPS أو localhost)
    const isSecureContext = window.isSecureContext || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      setPermissionStatus("denied");
      setGpsError("⚠️ يجب الوصول للتطبيق عبر HTTPS لتتمكن من استخدام الموقع الجغرافي.\n\nالرابط الحالي يستخدم HTTP وهو غير آمن.\nتواصل مع المدير للحصول على رابط HTTPS.");
      return;
    }

    if (!navigator.geolocation) {
      setPermissionStatus("unsupported");
      return;
    }

    async function checkAndRequest() {
      let currentState = "prompt";

      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: "geolocation" });
          currentState = result.state;
          setPermissionStatus(result.state);

          result.addEventListener("change", () => {
            setPermissionStatus(result.state);
            // إذا تغير الإذن إلى granted، اطلب الموقع مباشرة
            if (result.state === "granted") {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setLatitude(position.coords.latitude);
                  setLongitude(position.coords.longitude);
                  setSpeed(position.coords.speed);
                  setHeading(position.coords.heading);
                  setAccuracy(position.coords.accuracy);
                  setGpsError(null);
                },
                () => {},
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }
          });
        }
      } catch {
        // iOS Safari لا يدعم permissions API - نحاول مباشرة
        currentState = "prompt";
      }

      // طلب الإذن تلقائياً
      if (currentState === "prompt" || currentState === "granted") {
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setPermissionStatus("granted");
              setLatitude(position.coords.latitude);
              setLongitude(position.coords.longitude);
              setSpeed(position.coords.speed);
              setHeading(position.coords.heading);
              setAccuracy(position.coords.accuracy);
              setGpsError(null);
            },
            (error) => {
              if (error.code === error.PERMISSION_DENIED) {
                setPermissionStatus("denied");
              } else if (error.code === error.POSITION_UNAVAILABLE) {
                setPermissionStatus("granted"); // الإذن موجود لكن GPS غير متاح
                setGpsError("الموقع غير متاح حالياً. تأكد من:\n1. تفعيل GPS من إعدادات الجوال\n2. أنك في مكان مفتوح\n3. تفعيل بيانات الجوال أو WiFi");
              } else if (error.code === error.TIMEOUT) {
                setPermissionStatus("granted");
                setGpsError("انتهت مهلة تحديد الموقع. جاري إعادة المحاولة...");
                // إعادة المحاولة بعد timeout
                setTimeout(() => {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setPermissionStatus("granted");
                      setLatitude(pos.coords.latitude);
                      setLongitude(pos.coords.longitude);
                      setGpsError(null);
                    },
                    () => {},
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                  );
                }, 2000);
              }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
          );
        } catch (e) {
          console.error("Geolocation error:", e);
          setPermissionStatus("denied");
        }
      } else {
        setPermissionStatus(currentState);
      }
    }

    checkAndRequest();
  }, []);

  // جلب بيانات الباص المخصص للسائق
  useEffect(() => {
    async function fetchMyBus() {
      try {
        const res = await fetch("/Performance/api/driver/my-bus");
        if (!res.ok) throw new Error("فشل جلب البيانات");
        const data = await res.json();

        if (data.driver) setDriverInfo(data.driver);
        if (data.assignedBus) {
          setAssignedBus(data.assignedBus);
          setSelectedBusId(data.assignedBus.id);
        }
        if (data.availableBuses?.length > 0) {
          setAvailableBuses(data.availableBuses);
        }
      } catch (error) {
        console.error("Error fetching bus:", error);
        toast({
          title: "خطأ",
          description: "فشل جلب بيانات الباص المخصص",
          variant: "destructive",
        });
      } finally {
        setLoadingBus(false);
      }
    }
    if (!authLoading) fetchMyBus();
  }, [authLoading, toast]);

  // تصنيف جودة GPS بناءً على الدقة
  const classifyGpsQuality = useCallback((acc: number | null): "excellent" | "good" | "poor" | "cell-tower" | "unknown" => {
    if (acc === null) return "unknown";
    if (acc <= 20) return "excellent";
    if (acc <= 100) return "good";
    if (acc < 300) return "poor";
    return "cell-tower";
  }, []);

  // إرسال الموقع إلى الخادم — يرسل أفضل موقع GPS متاح
  const sendLocation = useCallback(
    async (pos: FullPosition) => {
      if (!selectedBusId) return;

      // إذا كان الموقع من برج خلوي (دقة >= 300م) ويوجد موقع GPS أفضل سابق، أرسل الأفضل
      const quality = classifyGpsQuality(pos.accuracy);
      let posToSend = pos;

      if (quality === "cell-tower" && bestPositionRef.current) {
        // أرسل آخر موقع GPS دقيق بدلاً من موقع البرج
        posToSend = bestPositionRef.current;
      }

      // إذا كان الموقع دقيقاً (< 300م)، احفظه كأفضل موقع
      if (quality !== "cell-tower" && quality !== "unknown") {
        bestPositionRef.current = pos;
      }

      try {
        const res = await fetch("/Performance/api/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            busId: selectedBusId,
            latitude: posToSend.lat,
            longitude: posToSend.lng,
            speed: calculatedSpeedRef.current !== null
              ? calculatedSpeedRef.current.toFixed(1)
              : posToSend.speed !== null
                ? (posToSend.speed * 3.6).toFixed(1)
                : "0",
            heading: posToSend.heading !== null ? posToSend.heading.toFixed(0) : null,
            accuracy: posToSend.accuracy !== null ? posToSend.accuracy.toFixed(0) : null,
          }),
        });

        if (res.ok) {
          setSendCount((prev) => prev + 1);
          setLastUpdate(new Date());
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error("Failed to send location:", errData);
        }
      } catch (error) {
        console.error("Send location error:", error);
      }
    },
    [selectedBusId, classifyGpsQuality]
  );

  const setTrackingStatus = useCallback(
    async (action: "start" | "stop") => {
      if (!selectedBusId) return;
      try {
        await fetch("/Performance/api/tracking", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ busId: selectedBusId, action }),
        });
      } catch (error) {
        console.error(`Failed to set tracking status (${action}):`, error);
      }
    },
    [selectedBusId]
  );

  const sendStopWithBeacon = useCallback((busId: string) => {
    if (typeof window === "undefined" || !navigator.sendBeacon) return false;
    try {
      const payload = JSON.stringify({ busId, action: "stop" });
      const blob = new Blob([payload], { type: "application/json" });
      return navigator.sendBeacon("/Performance/api/tracking", blob);
    } catch {
      return false;
    }
  }, []);

  const flushPendingStop = useCallback(
    async (busId: string) => {
      if (typeof window === "undefined" || !busId) return;
      const key = getPendingStopKey(busId);
      if (!localStorage.getItem(key)) return;

      try {
        await fetch("/Performance/api/tracking", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ busId, action: "stop" }),
          keepalive: true,
        });
        localStorage.removeItem(key);
      } catch {
        // سيُعاد المحاولة عند عودة الاتصال
      }
    },
    [getPendingStopKey]
  );

  // بدء التتبع
  const startTracking = useCallback(() => {
    if (!selectedBusId) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار الباص أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("المتصفح لا يدعم تحديد الموقع الجغرافي");
      return;
    }

    if (permissionStatus === "denied") {
      setGpsError("إذن الموقع مرفوض. افتح إعدادات المتصفح → الموقع → اسمح لهذا الموقع");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gpsRetryTimerRef.current) {
      clearTimeout(gpsRetryTimerRef.current);
      gpsRetryTimerRef.current = null;
    }
    if (firstPositionTimeoutRef.current) {
      clearTimeout(firstPositionTimeoutRef.current);
      firstPositionTimeoutRef.current = null;
    }

    setGpsError(null);
    setIsTracking(true);
    setSendCount(0);
    setTotalDistance(0);
    setCalculatedSpeed(null);
    calculatedSpeedRef.current = null;
    prevGpsPositionRef.current = null;
    void setTrackingStatus("start");
    if (typeof window !== "undefined") {
      localStorage.removeItem(getPendingStopKey(selectedBusId));
    }

    toast({
      title: "تم بدء التتبع ✅",
      description: "يتم إرسال موقعك كل 5 ثوانٍ",
    });

    // مراقبة الموقع باستمرار مع أقصى دقة
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const spd = position.coords.speed;
        const hdg = position.coords.heading;
        const acc = position.coords.accuracy;

        // تحديث واجهة المستخدم دائماً
        setLatitude(lat);
        setLongitude(lng);
        setSpeed(spd);
        setHeading(hdg);
        setAccuracy(acc);
        setGpsError(null);
        setPermissionStatus("granted");

        // تصنيف جودة GPS
        const quality = classifyGpsQuality(acc);

        // حساب المسافة والسرعة من تغير الموقع (فقط إذا الدقة جيدة < 300م)
        if (quality !== "cell-tower" && quality !== "unknown") {
          const now = Date.now();
          const prev = prevGpsPositionRef.current;
          if (prev) {
            const dist = haversineDistance(prev.lat, prev.lng, lat, lng);
            const timeDiffSec = (now - prev.time) / 1000;
            // تجاهل القفزات الكبيرة (خطأ GPS) أو الصغيرة جداً (ضجيج)
            if (dist >= 3 && dist < 1000 && timeDiffSec > 0) {
              setTotalDistance(d => d + dist);
              // حساب السرعة من المسافة/الوقت (كم/س)
              const spdCalc = (dist / timeDiffSec) * 3.6;
              if (spdCalc < 200) { // تجاهل سرعات غير واقعية
                setCalculatedSpeed(spdCalc);
                calculatedSpeedRef.current = spdCalc;
              }
            }
          }
          prevGpsPositionRef.current = { lat, lng, time: now };
        }
        setGpsQuality(quality);

        // حفظ كامل البيانات في المرجع
        const fullPos: FullPosition = { lat, lng, speed: spd, heading: hdg, accuracy: acc };
        lastPositionRef.current = fullPos;

        // حفظ أفضل موقع GPS (دقة < 300م) للاستخدام عند سقوط GPS
        if (quality !== "cell-tower" && quality !== "unknown") {
          bestPositionRef.current = fullPos;
        }

        // إذا كان الموقع من برج خلوي، حاول تحفيز GPS مرة أخرى
        if (quality === "cell-tower" && !gpsRetryTimerRef.current) {
          gpsRetryTimerRef.current = setTimeout(() => {
            gpsRetryTimerRef.current = null;
            // إعادة تشغيل watchPosition لتحفيز GPS
            if (watchIdRef.current !== null && isTrackingRef.current) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                  const coords = pos.coords;
                  const newQuality = classifyGpsQuality(coords.accuracy);
                  setLatitude(coords.latitude);
                  setLongitude(coords.longitude);
                  setSpeed(coords.speed);
                  setHeading(coords.heading);
                  setAccuracy(coords.accuracy);
                  setGpsError(null);
                  setPermissionStatus("granted");
                  setGpsQuality(newQuality);

                  // حساب المسافة والسرعة (نفس المنطق الأصلي)
                  if (newQuality !== "cell-tower" && newQuality !== "unknown") {
                    const now2 = Date.now();
                    const prev2 = prevGpsPositionRef.current;
                    if (prev2) {
                      const dist2 = haversineDistance(prev2.lat, prev2.lng, coords.latitude, coords.longitude);
                      const td2 = (now2 - prev2.time) / 1000;
                      if (dist2 >= 3 && dist2 < 1000 && td2 > 0) {
                        setTotalDistance(d => d + dist2);
                        const sc2 = (dist2 / td2) * 3.6;
                        if (sc2 < 200) {
                          setCalculatedSpeed(sc2);
                          calculatedSpeedRef.current = sc2;
                        }
                      }
                    }
                    prevGpsPositionRef.current = { lat: coords.latitude, lng: coords.longitude, time: now2 };
                  }

                  const fp: FullPosition = {
                    lat: coords.latitude, lng: coords.longitude,
                    speed: coords.speed, heading: coords.heading, accuracy: coords.accuracy
                  };
                  lastPositionRef.current = fp;
                  if (newQuality !== "cell-tower" && newQuality !== "unknown") {
                    bestPositionRef.current = fp;
                  }
                },
                () => {},
                { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
              );
            }
          }, 5000);
        }
      },
      (error) => {
        let msg = "خطأ غير معروف في GPS";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "تم رفض إذن الوصول للموقع!\n\nالحل:\n• iPhone: الإعدادات → Safari → الموقع → اسمح\n• Android: اضغط على القفل بجانب الرابط → أذونات الموقع → سماح";
            setPermissionStatus("denied");
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "الموقع غير متاح. تأكد من:\n1. تفعيل GPS (خدمات الموقع) من إعدادات الجوال\n2. اختيار 'دقة عالية' في إعدادات الموقع\n3. أنك في مكان مفتوح";
            break;
          case error.TIMEOUT:
            msg = "تأخر تحديد الموقع. يحاول مرة أخرى...";
            break;
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    );

    // إرسال الموقع كل 5 ثوانٍ مع كامل البيانات
    intervalRef.current = setInterval(() => {
      const pos = lastPositionRef.current;
      if (pos) {
        sendLocation(pos);
      }
    }, 5000);

    // إرسال أول موقع بعد 3 ثوانٍ لإعطاء GPS وقت للتثبيت
    firstPositionTimeoutRef.current = setTimeout(() => {
      const pos = lastPositionRef.current;
      if (pos) {
        sendLocation(pos);
      }
    }, 3000);
  }, [selectedBusId, sendLocation, toast, permissionStatus, setTrackingStatus, getPendingStopKey, classifyGpsQuality]);

  // إيقاف التتبع
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (gpsRetryTimerRef.current) {
      clearTimeout(gpsRetryTimerRef.current);
      gpsRetryTimerRef.current = null;
    }
    if (firstPositionTimeoutRef.current) {
      clearTimeout(firstPositionTimeoutRef.current);
      firstPositionTimeoutRef.current = null;
    }
    lastPositionRef.current = null;
    bestPositionRef.current = null;
    prevGpsPositionRef.current = null;
    calculatedSpeedRef.current = null;
    setIsTracking(false);
    setGpsQuality("unknown");
    setCalculatedSpeed(null);

    if (selectedBusId && typeof window !== "undefined") {
      localStorage.setItem(getPendingStopKey(selectedBusId), "1");
    }

    void setTrackingStatus("stop").finally(() => {
      if (selectedBusId && typeof window !== "undefined") {
        localStorage.removeItem(getPendingStopKey(selectedBusId));
      }
    });

    toast({
      title: "تم إيقاف التتبع",
      description: `تم إرسال ${sendCount} تحديث للموقع`,
    });
  }, [sendCount, toast, setTrackingStatus, selectedBusId, getPendingStopKey]);

  // التعامل مع فقدان/عودة الإنترنت وإغلاق الصفحة أثناء التتبع
  useEffect(() => {
    const handleOffline = () => {
      const activeBusId = selectedBusIdRef.current;
      if (!isTrackingRef.current || !activeBusId) return;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (gpsRetryTimerRef.current) {
        clearTimeout(gpsRetryTimerRef.current);
        gpsRetryTimerRef.current = null;
      }
      if (firstPositionTimeoutRef.current) {
        clearTimeout(firstPositionTimeoutRef.current);
        firstPositionTimeoutRef.current = null;
      }
      lastPositionRef.current = null;
      bestPositionRef.current = null;
      prevGpsPositionRef.current = null;
      calculatedSpeedRef.current = null;
      setIsTracking(false);
      setGpsQuality("unknown");
      setCalculatedSpeed(null);

      if (typeof window !== "undefined") {
        localStorage.setItem(getPendingStopKey(activeBusId), "1");
      }

      toast({
        title: "انقطع الإنترنت",
        description: "تم إيقاف التتبع محلياً وسيتم مزامنة حالة الإيقاف تلقائياً عند عودة الاتصال",
        variant: "destructive",
      });
    };

    const handleOnline = () => {
      const activeBusId = selectedBusIdRef.current;
      if (!activeBusId) return;
      void flushPendingStop(activeBusId);
    };

    const handlePageHide = () => {
      const activeBusId = selectedBusIdRef.current;
      if (!isTrackingRef.current || !activeBusId) return;

      if (typeof window !== "undefined") {
        localStorage.setItem(getPendingStopKey(activeBusId), "1");
      }

      const sent = sendStopWithBeacon(activeBusId);
      if (!sent) {
        void flushPendingStop(activeBusId);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushPendingStop, getPendingStopKey, sendStopWithBeacon, toast]);

  useEffect(() => {
    if (!selectedBusId) return;
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    void flushPendingStop(selectedBusId);
  }, [selectedBusId, flushPendingStop]);

  // تنظيف عند الخروج
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (gpsRetryTimerRef.current) {
        clearTimeout(gpsRetryTimerRef.current);
      }
      if (firstPositionTimeoutRef.current) {
        clearTimeout(firstPositionTimeoutRef.current);
      }
    };
  }, []);

  // كشف نوع الجهاز/المتصفح
  const getBrowserInfo = useCallback(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
    const isSamsung = /SamsungBrowser/.test(ua);
    return { isIOS, isAndroid, isSafari, isChrome, isSamsung };
  }, []);

  // طلب إذن الموقع يدوياً
  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionStatus("granted");
        setGpsError(null);
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast({ title: "تم السماح بالموقع ✅", description: "يمكنك الآن بدء التتبع" });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionStatus("denied");
          const { isIOS, isSafari, isChrome, isSamsung } = getBrowserInfo();
          let msg = "";
          if (isIOS && isSafari) {
            msg = "الإذن مرفوض. اتبع الخطوات:\n1. افتح 'الإعدادات' على الآيفون\n2. انزل إلى 'Safari'\n3. اضغط 'الموقع' (Location)\n4. اختر 'أثناء استخدام التطبيق' أو 'اسأل'\n5. ارجع وحدّث هذه الصفحة";
          } else if (isIOS && isChrome) {
            msg = "الإذن مرفوض. اتبع الخطوات:\n1. افتح 'الإعدادات' على الآيفون\n2. انزل إلى 'Chrome'\n3. فعّل 'الموقع' (Location)\n4. ارجع وحدّث هذه الصفحة";
          } else if (isChrome || isSamsung) {
            msg = "الإذن مرفوض. اتبع الخطوات:\n1. اضغط على 🔒 القفل بجانب الرابط أعلاه\n2. اضغط 'أذونات' أو 'إعدادات الموقع'\n3. غيّر 'الموقع الجغرافي' إلى 'سماح'\n4. حدّث الصفحة";
          } else {
            msg = "الإذن مرفوض. افتح إعدادات المتصفح → خصوصية → إذن الموقع → اسمح لهذا الموقع، ثم حدّث الصفحة";
          }
          setGpsError(msg);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsError("الموقع غير متاح. تأكد من تفعيل GPS من إعدادات الجوال");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [toast, getBrowserInfo]);

  if (authLoading || loadingBus) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-lg text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  const activeBus = assignedBus || availableBuses.find((b) => b.id === selectedBusId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4 md:p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* العنوان */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 px-4 py-2 rounded-full mb-3">
            <Navigation className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
              وضع السائق
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            تتبع الموقع المباشر
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.fullName && `مرحباً ${user.fullName} 👋`}
          </p>
        </div>

        {/* اختيار الباص */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bus className="w-5 h-5 text-blue-600" />
              الباص
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedBus ? (
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Bus className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg">باص {assignedBus.busNumber}</p>
                  <p className="text-sm text-gray-500">{assignedBus.district}</p>
                </div>
                <Badge variant="outline" className="mr-auto bg-green-100 text-green-700 border-green-300">
                  مخصص لك
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  لا يوجد باص مخصص لك. اختر الباص يدوياً:
                </p>
                <Select
                  value={selectedBusId}
                  onValueChange={setSelectedBusId}
                  disabled={isTracking}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الباص..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        باص {bus.busNumber} - {bus.district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* حالة إذن الموقع */}
        <Card className={`border-2 ${
          permissionStatus === "granted" 
            ? "border-green-300 bg-green-50/50 dark:bg-green-900/20" 
            : permissionStatus === "denied"
            ? "border-red-300 bg-red-50/50 dark:bg-red-900/20"
            : "border-amber-300 bg-amber-50/50 dark:bg-amber-900/20"
        }`}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  permissionStatus === "granted" ? "bg-green-100 dark:bg-green-900" :
                  permissionStatus === "denied" ? "bg-red-100 dark:bg-red-900" :
                  permissionStatus === "checking" ? "bg-gray-100 dark:bg-gray-800" :
                  "bg-amber-100 dark:bg-amber-900"
                }`}>
                  {permissionStatus === "granted" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : permissionStatus === "denied" ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : permissionStatus === "checking" ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Shield className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {permissionStatus === "granted" ? "إذن الموقع: مفعّل ✅" :
                     permissionStatus === "denied" ? "إذن الموقع: مرفوض ❌" :
                     permissionStatus === "checking" ? "جارٍ طلب إذن الموقع..." :
                     permissionStatus === "unsupported" ? "GPS غير مدعوم" :
                     "إذن الموقع: مطلوب ⏳"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {permissionStatus === "granted" ? "المتصفح يمكنه الوصول لموقعك" :
                     permissionStatus === "denied" ? "يجب تفعيل الإذن يدوياً (انظر التعليمات أدناه)" :
                     permissionStatus === "prompt" ? "إذا لم تظهر لك نافذة الإذن، اضغط الزر" :
                     ""}
                  </p>
                </div>
              </div>
              {(permissionStatus === "prompt" || permissionStatus === "denied") && (
                <Button
                  size="sm"
                  variant={permissionStatus === "denied" ? "destructive" : "default"}
                  onClick={requestPermission}
                >
                  {permissionStatus === "denied" ? "إعادة المحاولة" : "طلب الإذن"}
                </Button>
              )}
            </div>

            {/* تعليمات تفعيل الإذن عند الرفض */}
            {permissionStatus === "denied" && (
              <div className="mt-4 space-y-3">
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="font-bold text-red-700 dark:text-red-400 text-sm mb-3">⚠️ المتصفح يحتاج تفعيل يدوي للموقع:</p>
                  
                  {/* تعليمات iPhone Safari */}
                  <div className="mb-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-red-100 dark:border-red-900">
                    <p className="font-bold text-sm mb-2">📱 آيفون - Safari:</p>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>افتح <strong>الإعدادات</strong> (Settings) على الآيفون</li>
                      <li>انزل واختر <strong>Safari</strong></li>
                      <li>اضغط على <strong>الموقع</strong> (Location)</li>
                      <li>اختر <strong>&quot;اسأل&quot;</strong> أو <strong>&quot;أثناء الاستخدام&quot;</strong></li>
                      <li>ارجع لهذه الصفحة و<strong>حدّثها</strong> (اسحب لأسفل)</li>
                    </ol>
                  </div>

                  {/* تعليمات iPhone Chrome */}
                  <div className="mb-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-red-100 dark:border-red-900">
                    <p className="font-bold text-sm mb-2">📱 آيفون - Chrome:</p>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>افتح <strong>الإعدادات</strong> (Settings)</li>
                      <li>انزل واختر <strong>Chrome</strong></li>
                      <li>فعّل <strong>الموقع</strong> (Location)</li>
                      <li>ارجع وحدّث الصفحة</li>
                    </ol>
                  </div>

                  {/* تعليمات Android */}
                  <div className="mb-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-red-100 dark:border-red-900">
                    <p className="font-bold text-sm mb-2">🤖 أندرويد - Chrome:</p>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>اضغط على <strong>🔒 القفل</strong> بجانب الرابط في الأعلى</li>
                      <li>اضغط <strong>&quot;الأذونات&quot;</strong> أو <strong>&quot;إعدادات الموقع&quot;</strong></li>
                      <li>غيّر <strong>&quot;الموقع الجغرافي&quot;</strong> إلى <strong>&quot;سماح&quot;</strong></li>
                      <li>حدّث الصفحة</li>
                    </ol>
                  </div>

                  {/* تعليمات الكمبيوتر */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-red-100 dark:border-red-900">
                    <p className="font-bold text-sm mb-2">💻 الكمبيوتر:</p>
                    <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                      <li>اضغط على <strong>🔒 القفل</strong> أو <strong>ⓘ</strong> بجانب الرابط</li>
                      <li>ابحث عن <strong>&quot;الموقع الجغرافي&quot;</strong> أو <strong>&quot;Location&quot;</strong></li>
                      <li>غيّره من &quot;حظر&quot; إلى <strong>&quot;سماح&quot;</strong></li>
                      <li>حدّث الصفحة بـ <strong>Ctrl+Shift+R</strong></li>
                    </ol>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => window.location.reload()}
                  >
                    🔄 تحديث الصفحة بعد تفعيل الإذن
                  </Button>
                </div>

                {/* نصيحة إضافية */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    💡 <strong>نصيحة:</strong> تأكد أيضاً أن <strong>خدمات الموقع (GPS)</strong> مفعّلة من إعدادات الجوال الرئيسية (الإعدادات → الخصوصية → خدمات الموقع)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* زر التحكم */}
        <Card className={`border-2 transition-colors ${isTracking ? "border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`}>
          <CardContent className="pt-6">
            <Button
              size="lg"
              className={`w-full h-16 text-lg font-bold rounded-xl transition-all ${
                isTracking
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
                  : "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200"
              }`}
              onClick={isTracking ? stopTracking : startTracking}
              disabled={!selectedBusId}
            >
              {isTracking ? (
                <>
                  <PowerOff className="w-6 h-6 ml-2" />
                  إيقاف التتبع
                </>
              ) : (
                <>
                  <Power className="w-6 h-6 ml-2" />
                  بدء التتبع
                </>
              )}
            </Button>

            {isTracking && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-600 dark:text-green-400 font-medium text-sm">
                  جارٍ البث المباشر...
                </span>
              </div>
            )}

            {!selectedBusId && (
              <p className="text-center text-sm text-amber-500 mt-2">
                ⚠️ اختر الباص أولاً لبدء التتبع
              </p>
            )}
          </CardContent>
        </Card>

        {/* خطأ GPS */}
        {gpsError && (
          <Card className="border-2 border-red-300 bg-red-50 dark:bg-red-900/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{gpsError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* بيانات GPS */}
        {latitude !== null && longitude !== null && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
                بيانات الموقع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <MapPin className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xs text-gray-500">خط العرض</p>
                  <p className="font-mono font-bold text-sm">{latitude.toFixed(6)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <MapPin className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                  <p className="text-xs text-gray-500">خط الطول</p>
                  <p className="font-mono font-bold text-sm">{longitude.toFixed(6)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <Gauge className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-gray-500">السرعة</p>
                  <p className="font-mono font-bold text-sm">
                    {calculatedSpeed !== null
                      ? `${calculatedSpeed.toFixed(0)} كم/س`
                      : speed !== null
                        ? `${(speed * 3.6).toFixed(0)} كم/س`
                        : "0 كم/س"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <Navigation className="w-5 h-5 mx-auto text-teal-500 mb-1" />
                  <p className="text-xs text-gray-500">المسافة</p>
                  <p className="font-mono font-bold text-sm">
                    {totalDistance >= 1000
                      ? `${(totalDistance / 1000).toFixed(1)} كم`
                      : `${totalDistance.toFixed(0)} م`}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <Compass className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-xs text-gray-500">الاتجاه</p>
                  <p className="font-mono font-bold text-sm">
                    {heading !== null ? `${heading.toFixed(0)}°` : "—"}
                  </p>
                </div>
              </div>

              {/* إحصائيات الإرسال */}
              <div className="mt-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {isTracking ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    عدد التحديثات: <strong>{sendCount}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {lastUpdate
                      ? `آخر إرسال: ${lastUpdate.toLocaleTimeString("ar-SA")}`
                      : "لم يتم الإرسال بعد"}
                  </span>
                </div>
              </div>

              {accuracy !== null && (
                <div className="mt-3">
                  <div className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                    gpsQuality === 'excellent' ? 'bg-green-50 dark:bg-green-900/30' :
                    gpsQuality === 'good' ? 'bg-blue-50 dark:bg-blue-900/30' :
                    gpsQuality === 'poor' ? 'bg-amber-50 dark:bg-amber-900/30' :
                    gpsQuality === 'cell-tower' ? 'bg-red-50 dark:bg-red-900/30' :
                    'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <span className={`text-lg ${
                      gpsQuality === 'excellent' ? '' :
                      gpsQuality === 'good' ? '' :
                      gpsQuality === 'poor' ? '' :
                      gpsQuality === 'cell-tower' ? '' : ''
                    }`}>
                      {gpsQuality === 'excellent' ? '🟢' :
                       gpsQuality === 'good' ? '🔵' :
                       gpsQuality === 'poor' ? '🟡' :
                       gpsQuality === 'cell-tower' ? '🔴' : '⚪'}
                    </span>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${
                        gpsQuality === 'excellent' ? 'text-green-700 dark:text-green-400' :
                        gpsQuality === 'good' ? 'text-blue-700 dark:text-blue-400' :
                        gpsQuality === 'poor' ? 'text-amber-700 dark:text-amber-400' :
                        gpsQuality === 'cell-tower' ? 'text-red-700 dark:text-red-400' :
                        'text-gray-500'
                      }`}>
                        {gpsQuality === 'excellent' ? 'GPS ممتاز 🛰️' :
                         gpsQuality === 'good' ? 'GPS جيد 🛰️' :
                         gpsQuality === 'poor' ? 'GPS ضعيف ⚠️' :
                         gpsQuality === 'cell-tower' ? '⚠️ برج خلوي — ليس GPS!' : 'جارٍ التحديد...'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        دقة: ±{accuracy.toFixed(0)} متر
                        {gpsQuality === 'cell-tower' && bestPositionRef.current && ' (يُرسل آخر موقع GPS دقيق)'}
                      </p>
                    </div>
                  </div>
                  {gpsQuality === 'cell-tower' && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-400 font-bold">⚠️ الهاتف يستخدم برج الاتصالات بدلاً من GPS!</p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">لتحسين الدقة:</p>
                      <ol className="text-xs text-red-500 dark:text-red-400 list-decimal list-inside mt-1 space-y-0.5">
                        <li>افتح <strong>إعدادات الجوال → الموقع</strong></li>
                        <li>اختر <strong>"دقة عالية"</strong> أو <strong>"GPS و WiFi وشبكات الجوال"</strong></li>
                        <li>تأكد من أنك في <strong>مكان مفتوح</strong> (ليس داخل مبنى)</li>
                        <li>أعد تشغيل <strong>GPS</strong> (أغلقه وافتحه)</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* تعليمات */}
        {!isTracking && !latitude && (
          <Card className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-3">
                📱 تعليمات الاستخدام:
              </h3>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
                <li>اختر الباص المخصص لك (أو سيتم اختياره تلقائياً)</li>
                <li>اضغط على &quot;بدء التتبع&quot; لتفعيل GPS</li>
                <li>اسمح للتطبيق بالوصول إلى موقعك عند السؤال</li>
                <li>سيتم إرسال موقعك تلقائياً كل 10 ثوانٍ</li>
                <li>يمكن للمدير مراقبة موقعك من صفحة &quot;تتبع الباصات&quot;</li>
                <li>اضغط &quot;إيقاف التتبع&quot; عند انتهاء الرحلة</li>
              </ol>
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  💡 <strong>نصيحة:</strong> أبقِ الشاشة مفتوحة والتطبيق في الواجهة للحصول على أفضل دقة في التتبع.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* معلومات الباص المختار */}
        {activeBus && isTracking && (
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    باص {activeBus.busNumber}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activeBus.district}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
