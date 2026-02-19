"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  Bus,
  Link2,
  Unlink,
  Loader2,
  UserCheck,
  UserX,
  RefreshCw,
  UserPlus,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

interface DriverData {
  id: string;
  name: string;
  phone: string | null;
  licenseNumber: string | null;
  linkedUser: {
    id: string;
    username: string;
    fullName: string;
  } | null;
  assignedBus: {
    assignmentId: string;
    busId: string;
    busNumber: string;
    assignedAt: string;
  } | null;
}

interface UnlinkedUser {
  id: string;
  username: string;
  fullName: string;
}

interface BusOption {
  id: string;
  busNumber: string;
}

export default function DriverAssignmentsPage() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // اختيارات مؤقتة
  const [selectedUser, setSelectedUser] = useState<Record<string, string>>({});
  const [selectedBus, setSelectedBus] = useState<Record<string, string>>({});

  // نموذج إنشاء حساب
  const [createModal, setCreateModal] = useState<{ open: boolean; driver: DriverData | null }>({ open: false, driver: null });
  const [createForm, setCreateForm] = useState({ username: "", fullName: "", password: "", confirmPassword: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/Performance/api/admin/driver-assignments");
      if (res.ok) {
        const json = await res.json();
        setDrivers(json.drivers);
        setUnlinkedUsers(json.unlinkedUsers);
        setBuses(json.buses);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const doAction = async (
    action: string,
    driverId: string,
    extra: Record<string, string> = {}
  ) => {
    setActionLoading(`${action}-${driverId}`);
    try {
      const res = await fetch("/Performance/api/admin/driver-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, driverId, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "تم", description: data.message });
        fetchData();
      } else {
        toast({
          title: "خطأ",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "فشل الاتصال",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openCreate = (driver: DriverData) => {
    setCreateForm({ username: "", fullName: driver.name, password: "", confirmPassword: "" });
    setShowPass(false);
    setCreateModal({ open: true, driver });
  };

  const submitCreate = async () => {
    if (!createModal.driver) return;
    if (createForm.password !== createForm.confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (createForm.password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/Performance/api/admin/driver-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_driver_user",
          driverId: createModal.driver.id,
          username: createForm.username,
          fullName: createForm.fullName,
          password: createForm.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "✅ تم بنجاح", description: data.message });
        setCreateModal({ open: false, driver: null });
        fetchData();
      } else {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل الاتصال", variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900"
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* العنوان */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              ربط السائقين بالباصات
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              إدارة حسابات السائقين وتخصيص الباصات لهم
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
        </div>

        {/* ملخص */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{drivers.length}</p>
              <p className="text-xs text-blue-500">إجمالي السائقين</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-0">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {drivers.filter((d) => d.linkedUser).length}
              </p>
              <p className="text-xs text-green-500">مربوط بحساب</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-0">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {drivers.filter((d) => d.assignedBus).length}
              </p>
              <p className="text-xs text-purple-500">لديه باص</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-0">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {unlinkedUsers.length}
              </p>
              <p className="text-xs text-amber-500">حسابات غير مربوطة</p>
            </CardContent>
          </Card>
        </div>

        {/* قائمة السائقين */}
        <div className="space-y-4">
          {drivers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد سائقين. أضف سائقين من صفحة إدارة السائقين أولاً.</p>
              </CardContent>
            </Card>
          ) : (
            drivers.map((driver) => (
              <Card
                key={driver.id}
                className="border hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* معلومات السائق */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                          driver.linkedUser
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {driver.linkedUser ? (
                          <UserCheck className="w-6 h-6 text-green-600" />
                        ) : (
                          <UserX className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg truncate">{driver.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {driver.phone && (
                            <span className="text-xs text-gray-500" dir="ltr">
                              📱 {driver.phone}
                            </span>
                          )}
                          {driver.licenseNumber && (
                            <span className="text-xs text-gray-500">
                              🪪 {driver.licenseNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* الحالة والإجراءات */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* ربط الحساب */}
                      <div className="flex items-center gap-2">
                        {driver.linkedUser ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300"
                            >
                              <UserCheck className="w-3 h-3 ml-1" />
                              {driver.linkedUser.username}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                              onClick={() =>
                                doAction("unlink_user", driver.id)
                              }
                              disabled={actionLoading === `unlink_user-${driver.id}`}
                            >
                              {actionLoading === `unlink_user-${driver.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlink className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {/* ربط بحساب موجود */}
                            {unlinkedUsers.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Select
                                  value={selectedUser[driver.id] || ""}
                                  onValueChange={(v) =>
                                    setSelectedUser((prev) => ({ ...prev, [driver.id]: v }))
                                  }
                                >
                                  <SelectTrigger className="w-35 h-8 text-xs">
                                    <SelectValue placeholder="ربط بحساب..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unlinkedUsers.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.fullName} ({u.username})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  className="h-8 px-2"
                                  disabled={!selectedUser[driver.id] || actionLoading === `link_user-${driver.id}`}
                                  onClick={() => doAction("link_user", driver.id, { userId: selectedUser[driver.id] })}
                                >
                                  {actionLoading === `link_user-${driver.id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Link2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                            {/* إنشاء حساب جديد */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 gap-1"
                              onClick={() => openCreate(driver)}
                            >
                              <UserPlus className="w-3 h-3" />
                              إنشاء حساب جديد
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* تخصيص الباص */}
                      <div className="flex items-center gap-2">
                        {driver.assignedBus ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-300"
                            >
                              <Bus className="w-3 h-3 ml-1" />
                              باص {driver.assignedBus.busNumber}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                              onClick={() =>
                                doAction("unassign_bus", driver.id)
                              }
                              disabled={
                                actionLoading === `unassign_bus-${driver.id}`
                              }
                            >
                              {actionLoading ===
                              `unassign_bus-${driver.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Unlink className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Select
                              value={selectedBus[driver.id] || ""}
                              onValueChange={(v) =>
                                setSelectedBus((prev) => ({
                                  ...prev,
                                  [driver.id]: v,
                                }))
                              }
                            >
                              <SelectTrigger className="w-30 h-8 text-xs">
                                <SelectValue placeholder="اختر باص..." />
                              </SelectTrigger>
                              <SelectContent>
                                {buses.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    باص {b.busNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-8 px-2"
                              disabled={
                                !selectedBus[driver.id] ||
                                actionLoading === `assign_bus-${driver.id}`
                              }
                              onClick={() =>
                                doAction("assign_bus", driver.id, {
                                  busId: selectedBus[driver.id],
                                })
                              }
                            >
                              {actionLoading ===
                              `assign_bus-${driver.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Bus className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>

      {/* مودال إنشاء حساب سائق */}
      {createModal.open && createModal.driver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          {/* خلفية شفافة */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCreateModal({ open: false, driver: null })} />

          <Card className="relative w-full max-w-md shadow-2xl z-10">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
                    <UserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  إنشاء حساب للسائق
                </CardTitle>
                <button
                  onClick={() => setCreateModal({ open: false, driver: null })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                السائق: <strong className="text-slate-700 dark:text-slate-300">{createModal.driver.name}</strong>
              </p>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              {/* الاسم الكامل */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الاسم الكامل</Label>
                <Input
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="مثال: محمد أحمد"
                />
              </div>

              {/* اسم المستخدم */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">اسم المستخدم (للدخول)</Label>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                  placeholder="مثال: driver1"
                  dir="ltr"
                  className="font-mono"
                />
                <p className="text-xs text-slate-400">أحرف إنجليزية وأرقام فقط، بدون مسافات</p>
              </div>

              {/* كلمة المرور */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                    className="font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* تأكيد كلمة المرور */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">تأكيد كلمة المرور</Label>
                <Input
                  type={showPass ? "text" : "password"}
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="أعد كتابة كلمة المرور"
                  dir="ltr"
                  className={`font-mono ${createForm.confirmPassword && createForm.confirmPassword !== createForm.password ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                {createForm.confirmPassword && createForm.confirmPassword !== createForm.password && (
                  <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                )}
              </div>

              {/* أزرار */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={
                    createLoading ||
                    !createForm.username ||
                    !createForm.fullName ||
                    !createForm.password ||
                    createForm.password !== createForm.confirmPassword
                  }
                  onClick={submitCreate}
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span className="mr-1">{createLoading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCreateModal({ open: false, driver: null })}
                  disabled={createLoading}
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
