"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const res = await fetch("/Performance/api/universities");
      if (!res.ok) throw new Error(`فشل التحميل: ${res.status}`);
      const data = await res.json();
      setUniversities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب الجامعات:", error);
      toast({ title: "تعذر التحميل", description: "فشل تحميل الجامعات. حاول مجدداً.", variant: "destructive" });
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

      toast({ title: "نجاح", description: editingId ? "تم تعديل الجامعة بنجاح" : "تم إضافة الجامعة بنجاح" });
      setFormData({ name: "" });
      setEditingId(null);
      fetchUniversities();
    } catch (error) {
      toast({ title: "خطأ", description: error instanceof Error ? error.message : "خطأ غير معروف", variant: "destructive" });
      console.error("خطأ في حفظ الجامعة:", error);
    }
  };

  const handleEdit = (university: University) => {
    setFormData({ name: university.name });
    setEditingId(university.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الجامعة؟")) return;

    try {
      const res = await fetch(`/Performance/api/universities/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الحذف: ${res.status}`);
      }
      toast({ title: "نجاح", description: "تم حذف الجامعة بنجاح" });
      fetchUniversities();
    } catch (error) {
      toast({ title: "خطأ", description: `خطأ في حذف الجامعة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`, variant: "destructive" });
      console.error("خطأ في حذف الجامعة:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                {editingId ? "تعديل جامعة" : "إضافة جامعة جديدة"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-600 dark:text-slate-300">
                    اسم الجامعة
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="مثال: جامعة الملك سعود"
                    required
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500"
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
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
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
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">
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
                <div className="space-y-2 max-h-125 overflow-y-auto">
                  {universities.map((university) => (
                    <div
                      key={university.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">
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
