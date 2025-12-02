"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, ArrowRight, MapPin } from "lucide-react";

interface District {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    try {
      const res = await fetch("/Performance/api/districts");
      const data = await res.json();
      setDistricts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب الأحياء:", error);
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(
        editingId
          ? `/Performance/api/districts/${editingId}`
          : "/Performance/api/districts",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `فشل حفظ الحي: ${res.status}`);
      }

      alert(editingId ? "تم تعديل الحي بنجاح" : "تم إضافة الحي بنجاح");
      setFormData({ name: "", description: "" });
      setEditingId(null);
      fetchDistricts();
    } catch (error) {
      alert(`خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      console.error("خطأ في حفظ الحي:", error);
    }
  };

  const handleEdit = (district: District) => {
    setFormData({
      name: district.name,
      description: district.description || "",
    });
    setEditingId(district.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحي؟")) return;

    try {
      const res = await fetch(`/Performance/api/districts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الحذف: ${res.status}`);
      }
      alert("تم حذف الحي بنجاح");
      fetchDistricts();
    } catch (error) {
      alert(
        `خطأ في حذف الحي: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`
      );
      console.error("خطأ في حذف الحي:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                </div>
                {editingId ? "تعديل حي" : "إضافة حي جديد"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-600">
                    اسم الحي
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: حي الروضة"
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-slate-600">
                    الوصف (اختياري)
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="وصف الحي..."
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  >
                    {editingId ? "تحديث" : "إضافة"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      onClick={() => {
                        setFormData({ name: "", description: "" });
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

          {/* List */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">
                الأحياء المسجلة ({districts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-slate-500 py-8">
                  جاري التحميل...
                </p>
              ) : districts.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  لا توجد أحياء مسجلة
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {districts.map((district) => (
                    <div
                      key={district.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {district.name}
                        </p>
                        {district.description && (
                          <p className="text-sm text-slate-500">
                            {district.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                          onClick={() => handleEdit(district)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(district.id)}
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
