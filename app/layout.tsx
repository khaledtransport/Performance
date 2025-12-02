import "./globals.css";
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { NavigationBar } from "@/components/navigation-bar";
import { Breadcrumb } from "@/components/breadcrumb";

const cairo = Cairo({
  subsets: ["arabic"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة النقل الجامعي",
  description: "نظام متكامل لإدارة ومتابعة رحلات النقل الجامعي",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={cairo.className}>
        <NavigationBar />
        <Breadcrumb />
        <div className="bg-background text-foreground min-h-[calc(100vh-120px)]">
          {children}
        </div>
      </body>
    </html>
  );
}
