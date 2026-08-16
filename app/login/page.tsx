"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Bus, Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck } from "lucide-react";
import { roleHomePath } from "@/lib/rbac";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/Performance/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }

      const home = roleHomePath(data.user?.role).replace("/Performance", "") || "/";
      router.push(home);
      router.refresh();
    } catch {
      setError("فشل الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-blue-600 rounded-lg text-white">
            <Bus className="w-8 h-8" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            نظام النقل الجامعي
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            سجّل دخولك للوصول إلى لوحة التحكم والرحلات
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6 pb-8">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2.5 text-red-700 dark:text-red-300 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                اسم المستخدم
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="أدخل اسم المستخدم"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  required
                  className="pr-10 text-right h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                />
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className="pr-10 pl-10 text-right h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                />
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري تسجيل الدخول...
                </div>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>

          {/* معلومات مساعدة سريعة */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              اتصال آمن ومحمي بنظام JWT
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
