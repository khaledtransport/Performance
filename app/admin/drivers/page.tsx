"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/Performance/api/drivers");
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب السائقين:", error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(
        editingId
          ? `/Performance/api/drivers/${editingId}`
          : "/Performance/api/drivers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `فشل حفظ السائق: ${res.status}`);
      }

      alert(editingId ? "تم تعديل السائق بنجاح" : "تم إضافة السائق بنجاح");
      setFormData({ name: "", phone: "" });
      setEditingId(null);
      fetchDrivers();
    } catch (error) {
      alert(`خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      console.error("خطأ في حفظ السائق:", error);
    }
  };

  const handleEdit = (driver: Driver) => {
    setFormData({ name: driver.name, phone: driver.phone || "" });
    setEditingId(driver.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السائق؟")) return;

    try {
      const res = await fetch(`/Performance/api/drivers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الحذف: ${res.status}`);
      }
      alert("تم حذف السائق بنجاح");
      fetchDrivers();
    } catch (error) {
      alert(
        `خطأ في حذف السائق: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`
      );
      console.error("خطأ في حذف السائق:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                {editingId ? "تعديل سائق" : "إضافة سائق جديد"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-600">
                    اسم السائق
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: محمد أحمد"
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-600">
                    رقم الجوال
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="مثال: 0501234567"
                    dir="ltr"
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {editingId ? "تحديث" : "إضافة"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      onClick={() => {
                        setFormData({ name: "", phone: "" });
                        setEditingId(null);
                      }}
                    >
                      إلغاء
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">
                السائقين المسجلين ({drivers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-slate-500 py-8">
                  جاري التحميل...
                </p>
              ) : drivers.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  لا يوجد سائقين مسجلين
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {driver.name}
                        </p>
                        {driver.phone && (
                          <p className="text-sm text-slate-500" dir="ltr">
                            {driver.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleEdit(driver)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(driver.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
