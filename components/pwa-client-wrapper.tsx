"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

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
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const appPath = pathname.replace(/^\/Performance(?=\/|$)/, "") || "/";
  const canShowPrompts =
    !loading && Boolean(user) && !["/login", "/offline"].includes(appPath);

  return (
    <>
      <PWAInstallPrompt allowPrompt={canShowPrompts} />
      {canShowPrompts && (
        <>
          <PWAPermissionsPrompt />
          <PushRegistration />
        </>
      )}
    </>
  );
}
