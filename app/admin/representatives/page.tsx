"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Representative {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export default function RepresentativesPage() {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const fetchRepresentatives = async () => {
    try {
      const res = await fetch("/Performance/api/representatives");
      const data = await res.json();
      setRepresentatives(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب المندوبين:", error);
      setRepresentatives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(
        editingId
          ? `/Performance/api/representatives/${editingId}`
          : "/Performance/api/representatives",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `فشل حفظ المندوب: ${res.status}`);
      }

      alert(editingId ? "تم تعديل المندوب بنجاح" : "تم إضافة المندوب بنجاح");
      setFormData({ name: "", phone: "" });
      setEditingId(null);
      fetchRepresentatives();
    } catch (error) {
      alert(`خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      console.error("خطأ في حفظ المندوب:", error);
    }
  };

  const handleEdit = (rep: Representative) => {
    setFormData({ name: rep.name, phone: rep.phone || "" });
    setEditingId(rep.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المندوب؟")) return;

    try {
      const res = await fetch(`/Performance/api/representatives/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الحذف: ${res.status}`);
      }
      alert("تم حذف المندوب بنجاح");
      fetchRepresentatives();
    } catch (error) {
      alert(
        `خطأ في حذف المندوب: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`
      );
      console.error("خطأ في حذف المندوب:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-pink-50 rounded-lg">
                  <Plus className="w-5 h-5 text-pink-600" />
                </div>
                {editingId ? "تعديل مندوب" : "إضافة مندوب جديد"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-600">
                    اسم المندوب
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: خالد علي"
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:ring-pink-500"
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
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-pink-600 hover:bg-pink-700"
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
                المندوبين المسجلين ({representatives.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-slate-500 py-8">
                  جاري التحميل...
                </p>
              ) : representatives.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  لا يوجد مندوبين مسجلين
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {representatives.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{rep.name}</p>
                        {rep.phone && (
                          <p className="text-sm text-slate-500" dir="ltr">
                            {rep.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                          onClick={() => handleEdit(rep)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(rep.id)}
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
