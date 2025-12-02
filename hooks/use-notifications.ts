"use client"

import { useToast } from "@/components/ui/use-toast"

export function useNotifications() {
  const { toast } = useToast()

  const notifySaved = () => {
    toast({
      title: "تم الحفظ",
      description: "تم حفظ البيانات بنجاح",
      variant: "success",
    })
  }

  const notifyAdded = () => {
    toast({
      title: "تم الإضافة",
      description: "تم إضافة البيانات بنجاح",
      variant: "success",
    })
  }

  const notifyUpdated = () => {
    toast({
      title: "تم التحديث",
      description: "تم تحديث البيانات بنجاح",
      variant: "success",
    })
  }

  const notifyDeleted = () => {
    toast({
      title: "تم الحذف",
      description: "تم حذف البيانات بنجاح",
      variant: "destructive",
    })
  }

  const notifySuccess = (message: string) => {
    toast({
      title: "نجاح",
      description: message,
      variant: "success",
    })
  }

  const notifyError = (message: string) => {
    toast({
      title: "خطأ",
      description: message,
      variant: "destructive",
    })
  }

  return {
    notifySaved,
    notifyAdded,
    notifyUpdated,
    notifyDeleted,
    notifySuccess,
    notifyError,
    toast,
  }
}
