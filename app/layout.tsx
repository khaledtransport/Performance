import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { NavigationBar } from "@/components/navigation-bar";
import { Breadcrumb } from "@/components/breadcrumb";
import { AuthProvider } from "@/hooks/use-auth";
import { PWAInstallPrompt } from "@/components/pwa-install";
import { PWAPermissionsPrompt } from "@/components/pwa-permissions";
import { PushRegistration } from "@/components/push-registration";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  subsets: ["arabic"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة النقل الجامعي",
  description: "نظام متكامل لإدارة ومتابعة رحلات النقل الجامعي",
  icons: {
    icon: "/Performance/favicon.ico",
    shortcut: "/Performance/favicon.ico",
    apple: "/Performance/icons/icon-192x192.png",
  },
  manifest: "/Performance/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "النقل الجامعي",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/Performance/favicon.ico" />
        <link rel="apple-touch-icon" href="/Performance/icons/icon-192x192.png" />
      </head>
      <body className={cairo.className}>
        <AuthProvider>
          <NavigationBar />
          <Breadcrumb />
          <div className="bg-background text-foreground min-h-[calc(100vh-120px)]">
            {children}
          </div>
          <PWAInstallPrompt />
          <PWAPermissionsPrompt />
          <PushRegistration />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
