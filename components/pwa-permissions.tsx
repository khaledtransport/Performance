"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, ShieldCheck, X } from "lucide-react";

type PermissionStateLocal = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

const DISMISS_KEY = "pwa_permissions_dismissed_until";
const DISMISS_FOR_MS = 12 * 60 * 60 * 1000; // 12 ساعة

export function PWAPermissionsPrompt() {
  const [notifState, setNotifState] = useState<PermissionStateLocal>("unknown");
  const [geoState, setGeoState] = useState<PermissionStateLocal>("unknown");
  const [show, setShow] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || "0");
    if (dismissedUntil > Date.now()) {
      setShow(false);
      return;
    }

    if ("Notification" in window) {
      setNotifState(Notification.permission as PermissionStateLocal);
    } else {
      setNotifState("unsupported");
    }

    if (!navigator.geolocation || !window.isSecureContext) {
      setGeoState("unsupported");
      return;
    }

    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setGeoState(result.state as PermissionStateLocal);
          result.addEventListener("change", () => {
            setGeoState(result.state as PermissionStateLocal);
          });
        })
        .catch(() => setGeoState("prompt"));
    } else {
      setGeoState("prompt");
    }
  }, []);

  const needsPrompt = useMemo(() => {
    const needNotif = notifState === "prompt";
    const needGeo = geoState === "prompt";
    return needNotif || needGeo;
  }, [notifState, geoState]);

  useEffect(() => {
    if (notifState === "unknown" || geoState === "unknown") return;
    setShow(needsPrompt);
  }, [notifState, geoState, needsPrompt]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setNotifState("unsupported");
      return;
    }
    setLoadingNotif(true);
    try {
      const result = await Notification.requestPermission();
      setNotifState(result as PermissionStateLocal);
      window.dispatchEvent(new Event("notification-permission-updated"));
    } finally {
      setLoadingNotif(false);
    }
  };

  const requestLocation = async () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setGeoState("unsupported");
      return;
    }
    setLoadingGeo(true);
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setGeoState("granted");
            resolve();
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              setGeoState("denied");
            } else {
              setGeoState("prompt");
            }
            resolve();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      });
    } finally {
      setLoadingGeo(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_FOR_MS));
    setShow(false);
  };

  if (!show || !needsPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-107.5 z-50 animate-slide-up">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              تفعيل صلاحيات التطبيق
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              للحصول على تتبع حي وتنبيهات فورية مثل تطبيقات الأجرة، فعّل الإشعارات والموقع.
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {notifState === "prompt" && (
                <Button
                  onClick={requestNotifications}
                  size="sm"
                  disabled={loadingNotif}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Bell className="w-3.5 h-3.5 ml-1" />
                  {loadingNotif ? "جارٍ الطلب..." : "تفعيل الإشعارات"}
                </Button>
              )}

              {geoState === "prompt" && (
                <Button
                  onClick={requestLocation}
                  size="sm"
                  disabled={loadingGeo}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <MapPin className="w-3.5 h-3.5 ml-1" />
                  {loadingGeo ? "جارٍ الطلب..." : "تفعيل الموقع"}
                </Button>
              )}

              <Button
                onClick={dismiss}
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
              >
                لاحقًا
              </Button>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
