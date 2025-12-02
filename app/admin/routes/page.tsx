"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, ArrowRight } from "lucide-react";

interface University {
  id: string;
  name: string;
}

interface Driver {
  id: string;
  name: string;
}

interface Bus {
  id: string;
  busNumber: string;
  districts?: { district: { name: string } }[];
}

interface District {
  id: string;
  name: string;
}

interface Route {
  id: string;
  universityId: string;
  driverId: string;
  busId: string;
  university?: University;
  driver?: Driver;
  bus?: Bus;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    universityId: "",
    driverId: "",
    busId: "",
  });

  // جلب البيانات
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [routesRes, uniRes, drivRes, busRes, repRes] = await Promise.all([
          fetch("/Performance/api/routes"),
          fetch("/Performance/api/universities"),
          fetch("/Performance/api/drivers"),
          fetch("/Performance/api/buses"),
          fetch("/Performance/api/districts"),
        ]);

        if (!routesRes.ok)
          console.error(
            "Routes API failed",
            routesRes.status,
            await routesRes.text()
          );
        if (!uniRes.ok)
          console.error(
            "Universities API failed",
            uniRes.status,
            await uniRes.text()
          );
        if (!drivRes.ok)
          console.error(
            "Drivers API failed",
            drivRes.status,
            await drivRes.text()
          );
        if (!busRes.ok)
          console.error("Buses API failed", busRes.status, await busRes.text());
        if (!repRes.ok)
          console.error(
            "Districts API failed",
            repRes.status,
            await repRes.text()
          );

        if (
          !routesRes.ok ||
          !uniRes.ok ||
          !drivRes.ok ||
          !busRes.ok ||
          !repRes.ok
        ) {
          throw new Error("فشل تحميل البيانات - راجع الكونسول للتفاصيل");
        }

        const routesData = await routesRes.json();
        const uniData = await uniRes.json();
        const drivData = await drivRes.json();
        const busData = await busRes.json();
        const distData = await repRes.json();

        setRoutes(Array.isArray(routesData) ? routesData : []);
        setUniversities(Array.isArray(uniData) ? uniData : []);
        setDrivers(Array.isArray(drivData) ? drivData : []);
        setBuses(Array.isArray(busData) ? busData : []);
        setDistricts(Array.isArray(distData) ? distData : []);
        setError("");
      } catch (err) {
        console.error("Fetch error:", err);
        setError("خطأ في جلب البيانات - تأكد من تشغيل السيرفر وقاعدة البيانات");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // إضافة route جديد
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.universityId || !formData.driverId || !formData.busId) {
      setError("يجب اختيار الجامعة والسائق والباص");
      return;
    }

    try {
      const payload: any = {
        universityId: formData.universityId,
        driverId: formData.driverId,
        busId: formData.busId,
      };

      const res = await fetch("/Performance/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", res.status, errorData);
        throw new Error(
          "فشل إضافة الطريق: " + (errorData.error || "خطأ غير معروف")
        );
      }

      const newRoute = await res.json();
      setRoutes([...routes, newRoute]);
      setFormData({
        universityId: "",
        driverId: "",
        busId: "",
      });
      setError("");
    } catch (err) {
      setError("خطأ في إضافة الطريق");
      console.error(err);
    }
  };

  // حذف route
  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الطريق؟")) return;

    try {
      const res = await fetch(`/Performance/api/routes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `فشل الحذف: ${res.status}`);
      }
      setRoutes(routes.filter((r) => r.id !== id));
      setError("");
      alert("تم حذف الطريق بنجاح");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "خطأ غير معروف";
      setError(`خطأ في الحذف: ${errorMsg}`);
      console.error(err);
    }
  };

  const getUniName = (id: string) =>
    universities.find((u) => u.id === id)?.name || "غير معروفة";
  const getDriverName = (id: string) =>
    drivers.find((d) => d.id === id)?.name || "غير معروف";
  const getBusName = (id: string) =>
    buses.find((b) => b.id === id)?.busNumber || "غير معروفة";

  if (loading)
    return <div className="p-8 text-center text-blue-300">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded mb-4 backdrop-blur">
            {error}
          </div>
        )}

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Plus className="w-5 h-5 text-indigo-600" />
              </div>
              إضافة طريق جديد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.universityId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, universityId: value })
                  }
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="اختر جامعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((uni) => (
                      <SelectItem key={uni.id} value={uni.id}>
                        {uni.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.driverId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, driverId: value })
                  }
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="اختر سائق" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driv) => (
                      <SelectItem key={driv.id} value={driv.id}>
                        {driv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={formData.busId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, busId: value })
                  }
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="اختر باص" />
                  </SelectTrigger>
                  <SelectContent>
                    {buses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.busNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                إضافة طريق
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">
              الطرق الموجودة ({routes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {routes.length === 0 ? (
                <p className="text-blue-300 text-center py-8">لا توجد طرق</p>
              ) : (
                routes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        {getUniName(route.universityId)}
                      </p>
                      <p className="text-sm text-slate-500">
                        سائق: {getDriverName(route.driverId)} | باص:{" "}
                        {getBusName(route.busId)}
                        {route.bus?.districts &&
                          route.bus.districts.length > 0 && (
                            <>
                              {" "}
                              | الأحياء:{" "}
                              {route.bus.districts
                                .map((d: any) => d.district.name)
                                .join(", ")}
                            </>
                          )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(route.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
