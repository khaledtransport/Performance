"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface University {
  id: string;
  name: string;
  createdAt: string;
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const res = await fetch("/Performance/api/universities");
      const data = await res.json();
      setUniversities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب الجامعات:", error);
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(
        editingId
          ? `/Performance/api/universities/${editingId}`
          : "/Performance/api/universities",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `فشل حفظ الجامعة: ${res.status}`);
      }

      alert(editingId ? "تم تعديل الجامعة بنجاح" : "تم إضافة الجامعة بنجاح");
      setFormData({ name: "" });
      setEditingId(null);
      fetchUniversities();
    } catch (error) {
      alert(`خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      console.error("خطأ في حفظ الجامعة:", error);
    }
  };

  const handleEdit = (university: University) => {
    setFormData({ name: university.name });
    setEditingId(university.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الجامعة؟")) return;

    try {
      const res = await fetch(`/Performance/api/universities/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الحذف: ${res.status}`);
      }
      alert("تم حذف الجامعة بنجاح");
      fetchUniversities();
    } catch (error) {
      alert(
        `خطأ في حذف الجامعة: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`
      );
      console.error("خطأ في حذف الجامعة:", error);
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
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                {editingId ? "تعديل جامعة" : "إضافة جامعة جديدة"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-600">
                    اسم الجامعة
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="مثال: جامعة الملك سعود"
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {editingId ? "تحديث" : "إضافة"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      onClick={() => {
                        setFormData({ name: "" });
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
                الجامعات المسجلة ({universities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-slate-500 py-8">
                  جاري التحميل...
                </p>
              ) : universities.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  لا توجد جامعات مسجلة
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {universities.map((university) => (
                    <div
                      key={university.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                      <span className="font-medium text-slate-900">
                        {university.name}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEdit(university)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(university.id)}
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
