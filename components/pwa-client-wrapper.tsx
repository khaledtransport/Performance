"use client";

import dynamic from "next/dynamic";

const PWAInstallPrompt = dynamic(
  () => import("@/components/pwa-install").then((m) => m.PWAInstallPrompt),
  { ssr: false }
);
const PWAPermissionsPrompt = dynamic(
  () => import("@/components/pwa-permissions").then((m) => m.PWAPermissionsPrompt),
  { ssr: false }
);
const PushRegistration = dynamic(
  () => import("@/components/push-registration").then((m) => m.PushRegistration),
  { ssr: false }
);

export function PWAClientWrapper() {
  return (
    <>
      <PWAInstallPrompt />
      <PWAPermissionsPrompt />
      <PushRegistration />
    </>
  );
}
