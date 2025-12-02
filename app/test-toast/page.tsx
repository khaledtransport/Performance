"use client"

import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"

export default function TestToastPage() {
  const { notifySaved, notifyAdded, notifyUpdated, notifyDeleted, notifyError } = useNotifications()

  return (
    <div className="container mx-auto p-10 space-y-4">
      <h1 className="text-2xl font-bold mb-6">اختبار الإشعارات</h1>
      <div className="flex flex-wrap gap-4">
        <Button onClick={notifySaved} className="bg-green-600 hover:bg-green-700">
          تم الحفظ
        </Button>
        <Button onClick={notifyAdded} className="bg-blue-600 hover:bg-blue-700">
          تم الإضافة
        </Button>
        <Button onClick={notifyUpdated} className="bg-yellow-600 hover:bg-yellow-700">
          تم التحديث
        </Button>
        <Button onClick={notifyDeleted} variant="destructive">
          تم الحذف
        </Button>
        <Button onClick={() => notifyError("حدث خطأ غير متوقع")} variant="destructive">
          خطأ مخصص
        </Button>
      </div>
    </div>
  )
}
