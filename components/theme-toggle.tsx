"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = stored === "dark" || (!stored && media.matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    const syncSystemTheme = (event: MediaQueryListEvent) => {
      if (localStorage.getItem("theme")) return;
      setDark(event.matches);
      document.documentElement.classList.toggle("dark", event.matches);
    };
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  const toggle = () => {
    const newDark = !dark;
    setDark(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDark);
  };

  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      aria-pressed={dark}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
      title={dark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
