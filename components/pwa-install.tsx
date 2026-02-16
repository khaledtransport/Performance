"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // تسجيل Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/Performance/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch((err) => console.log("SW registration failed:", err));
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // انتظر قليلاً قبل عرض الإشعار
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl shrink-0">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              تثبيت التطبيق
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ثبّت التطبيق للوصول السريع والعمل بدون إنترنت
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
              >
                تثبيت الآن
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-xs h-8"
              >
                لاحقاً
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
