import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const tripStatusMap = {
  PENDING: 'قيد الانتظار',
  DEPARTED: 'غادر',
  ARRIVED: 'وصل',
  DELAYED: 'متأخر',
  CANCELLED: 'ملغي',
}

export const tripDirectionMap = {
  GO: 'ذهاب',
  RETURN: 'عودة',
}

export function getStatusColor(status: string): string {
  const colors = {
    PENDING: 'bg-yellow-500',
    DEPARTED: 'bg-blue-500',
    ARRIVED: 'bg-green-500',
    DELAYED: 'bg-orange-500',
    CANCELLED: 'bg-red-500',
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500'
}
