"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Bus,
  Settings as SettingsIcon,
  X,
  Volume2,
  VolumeX,
  Clock,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: string;
  soundType?: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

// ============ تكوين الأنواع مع الألوان ============
const typeConfig: Record<
  string,
  {
    icon: React.ReactNode;
    label: string;
    bgUnread: string;
    bgRead: string;
    border: string;
    iconBg: string;
    titleColor: string;
    textColor: string;
  }
> = {
  INFO: {
    icon: <Info className="w-5 h-5" />,
    label: "معلومات",
    bgUnread: "bg-blue-50 dark:bg-blue-950/40",
    bgRead: "bg-blue-50/30 dark:bg-blue-950/20",
    border: "border-r-4 border-r-blue-500",
    iconBg:
      "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-900 dark:text-blue-100",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  SUCCESS: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: "نجاح",
    bgUnread: "bg-emerald-50 dark:bg-emerald-950/40",
    bgRead: "bg-emerald-50/30 dark:bg-emerald-950/20",
    border: "border-r-4 border-r-emerald-500",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    titleColor: "text-emerald-900 dark:text-emerald-100",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  WARNING: {
    icon: <AlertTriangle className="w-5 h-5" />,
    label: "تحذير",
    bgUnread: "bg-amber-50 dark:bg-amber-950/40",
    bgRead: "bg-amber-50/30 dark:bg-amber-950/20",
    border: "border-r-4 border-r-amber-500",
    iconBg:
      "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-900 dark:text-amber-100",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  ERROR: {
    icon: <XCircle className="w-5 h-5" />,
    label: "خطأ",
    bgUnread: "bg-red-50 dark:bg-red-950/40",
    bgRead: "bg-red-50/30 dark:bg-red-950/20",
    border: "border-r-4 border-r-red-500",
    iconBg: "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400",
    titleColor: "text-red-900 dark:text-red-100",
    textColor: "text-red-700 dark:text-red-300",
  },
  TRIP_UPDATE: {
    icon: <Bus className="w-5 h-5" />,
    label: "تحديث رحلة",
    bgUnread: "bg-indigo-50 dark:bg-indigo-950/40",
    bgRead: "bg-indigo-50/30 dark:bg-indigo-950/20",
    border: "border-r-4 border-r-indigo-500",
    iconBg:
      "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400",
    titleColor: "text-indigo-900 dark:text-indigo-100",
    textColor: "text-indigo-700 dark:text-indigo-300",
  },
  SYSTEM: {
    icon: <SettingsIcon className="w-5 h-5" />,
    label: "نظام",
    bgUnread: "bg-slate-100 dark:bg-slate-800/60",
    bgRead: "bg-slate-50/50 dark:bg-slate-800/30",
    border: "border-r-4 border-r-slate-500",
    iconBg:
      "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    titleColor: "text-slate-900 dark:text-slate-100",
    textColor: "text-slate-600 dark:text-slate-400",
  },
  URGENT: {
    icon: <AlertOctagon className="w-5 h-5" />,
    label: "عاجل",
    bgUnread: "bg-rose-50 dark:bg-rose-950/40",
    bgRead: "bg-rose-50/30 dark:bg-rose-950/20",
    border: "border-r-4 border-r-rose-600",
    iconBg:
      "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
    titleColor: "text-rose-900 dark:text-rose-100",
    textColor: "text-rose-700 dark:text-rose-300",
  },
  SCHEDULE: {
    icon: <Clock className="w-5 h-5" />,
    label: "جدول",
    bgUnread: "bg-violet-50 dark:bg-violet-950/40",
    bgRead: "bg-violet-50/30 dark:bg-violet-950/20",
    border: "border-r-4 border-r-violet-500",
    iconBg:
      "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
    titleColor: "text-violet-900 dark:text-violet-100",
    textColor: "text-violet-700 dark:text-violet-300",
  },
};

const defaultTypeConfig = typeConfig.INFO;

// ============ نظام الصوت ============
class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("notif_sound") !== "off";
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioContext || this.audioContext.state === "closed") {
      try {
        const AC =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext: typeof AudioContext;
            }
          ).webkitAudioContext;
        this.audioContext = new AC();
      } catch {
        return null;
      }
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("notif_sound", this.enabled ? "on" : "off");
    }
    this.getContext();
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async play(soundType?: string) {
    if (!this.enabled || soundType === "none") return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      await ctx.resume();
      const now = ctx.currentTime;

      switch (soundType) {
        case "urgent":
          for (let i = 0; i < 3; i++) {
            this.beep(ctx, 1000, "sawtooth", now + i * 0.25, 0.2, 0.5);
            this.beep(
              ctx,
              800,
              "sawtooth",
              now + i * 0.25 + 0.12,
              0.12,
              0.4
            );
          }
          break;
        case "alert":
          this.beep(ctx, 880, "square", now, 0.15, 0.35);
          this.beep(ctx, 660, "square", now + 0.18, 0.15, 0.3);
          this.beep(ctx, 880, "square", now + 0.36, 0.15, 0.35);
          break;
        case "success":
          this.beep(ctx, 523, "sine", now, 0.15, 0.3);
          this.beep(ctx, 659, "sine", now + 0.15, 0.15, 0.3);
          this.beep(ctx, 784, "sine", now + 0.3, 0.25, 0.35);
          break;
        default:
          this.beep(ctx, 800, "sine", now, 0.12, 0.35);
          this.beep(ctx, 600, "sine", now + 0.15, 0.15, 0.3);
          break;
      }

      if (
        navigator.vibrate &&
        (soundType === "urgent" || soundType === "alert")
      ) {
        navigator.vibrate(
          soundType === "urgent"
            ? [200, 100, 200, 100, 200]
            : [150, 80, 150]
        );
      }
    } catch (e) {
      console.warn("Sound play failed:", e);
    }
  }

  private beep(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    start: number,
    duration: number,
    volume: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}

// ============ المكون الرئيسي ============
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Notification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef<NotificationSoundManager | null>(null);
  const lastIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    soundRef.current = new NotificationSoundManager();
    setSoundEnabled(soundRef.current.isEnabled());
  }, []);

  // تهيئة AudioContext عند أول تفاعل
  useEffect(() => {
    const initAudio = () => {
      soundRef.current?.play("none");
      document.removeEventListener("click", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };
    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("touchstart", initAudio, { once: true });
    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("touchstart", initAudio);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/Performance/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      const newNotifs: Notification[] = data.notifications || [];
      setNotifications(newNotifs);
      setUnreadCount(data.unreadCount || 0);

      const newIds = new Set(newNotifs.map((n) => n.id));
      if (!isFirstLoadRef.current) {
        const freshNotifs = newNotifs.filter(
          (n) => !lastIdsRef.current.has(n.id) && !n.isRead
        );
        if (freshNotifs.length > 0) {
          const latest = freshNotifs[0];
          const snd =
            latest.soundType ||
            (latest.type === "URGENT"
              ? "urgent"
              : latest.type === "WARNING"
                ? "alert"
                : latest.type === "SUCCESS"
                  ? "success"
                  : "default");
          soundRef.current?.play(snd);
          showBanner(latest);
        }
      }
      lastIdsRef.current = newIds;
      isFirstLoadRef.current = false;
    } catch {
      // صامت
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNotifications]);

  const showBanner = (notif: Notification) => {
    setBanner(notif);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBanner(null), 6000);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/Performance/api/notifications/${id}`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // صامت
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await fetch("/Performance/api/notifications", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // صامت
    } finally {
      setLoading(false);
    }
  };

  const toggleSound = () => {
    if (soundRef.current) {
      const newState = soundRef.current.toggle();
      setSoundEnabled(newState);
      if (newState) soundRef.current.play("default");
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} د`;
    if (diffHours < 24) return `منذ ${diffHours} س`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString("ar-SA");
  };

  const getConfig = (type: string) => typeConfig[type] || defaultTypeConfig;

  const getPriorityBadge = (priority?: string) => {
    if (priority === "CRITICAL")
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
          ⚡ حرج
        </span>
      );
    if (priority === "HIGH")
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
          ⚠ مرتفع
        </span>
      );
    return null;
  };

  return (
    <>
      {/* ============ بانر الإشعار الجديد ============ */}
      {banner && (
        <div className="fixed top-4 left-4 right-4 z-100 animate-in slide-in-from-top">
          <div
            className={`mx-auto max-w-md rounded-xl shadow-2xl overflow-hidden ${getConfig(banner.type).border} ${getConfig(banner.type).bgUnread}`}
            onClick={() => {
              setBanner(null);
              setOpen(true);
            }}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getConfig(banner.type).iconBg}`}
                >
                  {getConfig(banner.type).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getConfig(banner.type).iconBg}`}
                    >
                      {getConfig(banner.type).label}
                    </span>
                    {getPriorityBadge(banner.priority)}
                  </div>
                  <h4
                    className={`font-bold text-sm ${getConfig(banner.type).titleColor}`}
                  >
                    {banner.title}
                  </h4>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${getConfig(banner.type).textColor}`}
                  >
                    {banner.message}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBanner(null);
                  }}
                  className="shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="h-1 bg-black/5 dark:bg-white/5">
              <div
                className="h-full bg-current opacity-30 animate-shrink-width"
                style={{ animationDuration: "6s" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ زر الجرس ============ */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/30">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* ============ قائمة الإشعارات ============ */}
        {open && (
          <>
            {/* خلفية ضبابية للجوال */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setOpen(false)}
            />

            {/* 
              الجوال: fixed في وسط الشاشة مع هوامش متساوية من اليمين واليسار
              الديسكتوب: absolute ملتصق بزر الجرس من اليمين
            */}
            <div className="fixed inset-x-3 top-14 bottom-auto max-h-[80vh] md:absolute md:inset-auto md:right-0 md:left-auto md:top-full md:mt-2 md:w-100 md:max-h-130 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-linear-to-l from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">
                    الإشعارات
                  </span>
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0 rounded-full"
                    >
                      {unreadCount} جديد
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleSound}
                    className={`p-2 rounded-lg transition-colors ${soundEnabled ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                    title={soundEnabled ? "إيقاف الصوت" : "تفعيل الصوت"}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      <CheckCheck className="w-3.5 h-3.5 ml-1" />
                      قراءة الكل
                    </Button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* قائمة الإشعارات */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                      لا توجد إشعارات
                    </p>
                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                      ستظهر الإشعارات هنا
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.map((notif) => {
                      const conf = getConfig(notif.type);
                      return (
                        <div
                          key={notif.id}
                          onClick={() =>
                            !notif.isRead && markAsRead(notif.id)
                          }
                          className={`relative transition-all duration-200 cursor-pointer ${conf.border} ${notif.isRead ? conf.bgRead + " opacity-75" : conf.bgUnread} hover:brightness-95 dark:hover:brightness-110 active:scale-[0.99]`}
                        >
                          <div className="p-3 sm:p-4">
                            <div className="flex items-start gap-3">
                              {/* أيقونة النوع */}
                              <div
                                className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${conf.iconBg} ${notif.isRead ? "opacity-60" : ""}`}
                              >
                                {conf.icon}
                              </div>

                              {/* المحتوى */}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                {/* النوع + الأولوية */}
                                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conf.iconBg}`}
                                  >
                                    {conf.label}
                                  </span>
                                  {getPriorityBadge(notif.priority)}
                                  {!notif.isRead && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                  )}
                                </div>

                                {/* العنوان */}
                                <h4
                                  className={`text-[13px] sm:text-sm font-bold leading-normal wrap-break-word ${notif.isRead ? "text-slate-500 dark:text-slate-400 font-medium" : conf.titleColor}`}
                                >
                                  {notif.title}
                                </h4>

                                {/* نص الرسالة - كامل بدون قص */}
                                <p
                                  className={`text-[12px] sm:text-[13px] leading-relaxed mt-1 wrap-break-word ${notif.isRead ? "text-slate-400 dark:text-slate-500" : conf.textColor}`}
                                >
                                  {notif.message}
                                </p>

                                {/* الوقت */}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {formatTime(notif.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="shrink-0 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-center">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {unreadCount > 0
                      ? `${unreadCount} إشعار غير مقروء`
                      : "تم قراءة جميع الإشعارات ✓"}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
