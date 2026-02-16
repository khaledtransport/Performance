"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushRegistration() {
  const { user } = useAuth();
  const inFlight = useRef(false);

  const ensurePushSubscription = useCallback(async () => {
    if (!user || inFlight.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    inFlight.current = true;
    try {
      const registration = await navigator.serviceWorker.register("/Performance/sw.js", {
        updateViaCache: "none",
      });
      await registration.update();
      const swRegistration = await navigator.serviceWorker.ready;

      const keyRes = await fetch("/Performance/api/push/public-key", {
        credentials: "include",
        cache: "no-store",
      });

      if (!keyRes.ok) return;
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) return;

      const existing = await swRegistration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(publicKey),
        }));

      await fetch("/Performance/api/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error("Push registration error:", error);
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    ensurePushSubscription();
  }, [ensurePushSubscription]);

  useEffect(() => {
    const handler = () => {
      void ensurePushSubscription();
    };

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        void ensurePushSubscription();
      }
    };

    window.addEventListener("notification-permission-updated", handler);
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      window.removeEventListener("notification-permission-updated", handler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [ensurePushSubscription]);

  return null;
}
