"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface District {
  id: string;
  name: string;
}

interface Bus {
  id: string;
  busNumber: string;
  capacity: number;
  districts: Array<{
    id: string;
    district: District;
  }>;
  createdAt: string;
}

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    busNumber: "",
    capacity: "",
    districtIds: [] as string[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBuses();
    fetchDistricts();
  }, []);

  const fetchBuses = async () => {
    try {
      const res = await fetch("/Performance/api/buses");
      const data = await res.json();
      setBuses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب الحافلات:", error);
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async () => {
    try {
      const res = await fetch("/Performance/api/districts");
      const data = await res.json();
      setDistricts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("خطأ في جلب الأحياء:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        busNumber: formData.busNumber,
        capacity: parseInt(formData.capacity),
        districtIds: formData.districtIds,
      };

      const res = await fetch(
        editingId
          ? `/Performance/api/buses/${editingId}`
          : "/Performance/api/buses",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `فشل حفظ الباص: ${res.status}`);
      }

      alert(editingId ? "تم تعديل الباص بنجاح" : "تم إضافة الباص بنجاح");
      setFormData({ busNumber: "", capacity: "", districtIds: [] });
      setEditingId(null);
      fetchBuses();
    } catch (error) {
      alert(`خطأ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      console.error("خطأ في حفظ الباص:", error);
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingId(bus.id);
    setFormData({
      busNumber: bus.busNumber,
      capacity: bus.capacity.toString(),
      districtIds: bus.districts.map((d) => d.district.id),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الباص؟")) return;

    try {
      const res = await fetch(`/Performance/api/buses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `خطأ في الحذف: ${res.status}`);
      }
      alert("تم حذف الباص بنجاح");
      fetchBuses();
    } catch (error) {
      alert(
        `خطأ في حذف الباص: ${
          error instanceof Error ? error.message : "خطأ غير معروف"
        }`
      );
      console.error("خطأ في حذف الباص:", error);
    }
  };

  const toggleDistrict = (districtId: string) => {
    setFormData((prev) => {
      const currentIds = prev.districtIds;
      if (currentIds.includes(districtId)) {
        return {
          ...prev,
          districtIds: currentIds.filter((id) => id !== districtId),
        };
      } else {
        return { ...prev, districtIds: [...currentIds, districtId] };
      }
    });
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="p-8" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* قائمة الباصات */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">
            الحافلات المسجلة ({buses.length})
          </h2>
          {buses.map((bus) => (
            <Card key={bus.id} className="bg-white">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{bus.busNumber}</h3>
                  <p className="text-sm text-gray-500">
                    السعة: {bus.capacity} راكب
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bus.districts.length > 0 ? (
                      bus.districts.map((d) => (
                        <span
                          key={d.id}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded"
                        >
                          {d.district.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">
                        لا يوجد أحياء
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(bus)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(bus.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* نموذج الإضافة/التعديل */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? "تعديل الحافلة" : "إضافة حافلة جديدة"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم الحافلة</Label>
                  <Input
                    placeholder="مثال: 1234"
                    value={formData.busNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, busNumber: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>السعة (عدد الركاب)</Label>
                  <Input
                    type="number"
                    placeholder="مثال: 50"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>الأحياء (اختياري)</Label>
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2 bg-white">
                    {districts.length > 0 ? (
                      districts.map((district) => (
                        <div
                          key={district.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            id={`district-${district.id}`}
                            checked={formData.districtIds.includes(district.id)}
                            onChange={() => toggleDistrict(district.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`district-${district.id}`}
                            className="text-sm text-gray-700 cursor-pointer select-none flex-1"
                          >
                            {district.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center">
                        لا توجد أحياء مسجلة
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    يمكنك اختيار أكثر من حي للحافلة الواحدة
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {editingId ? "حفظ التعديلات" : "إضافة"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          busNumber: "",
                          capacity: "",
                          districtIds: [],
                        });
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
        </div>
      </div>
    </div>
  );
}
