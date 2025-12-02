"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, XCircle } from "lucide-react";
import { TripEntry } from "./types";
import { MobileTripCard } from "@/components/mobile-trip-card";
import { useState, useEffect } from "react";

interface TodayTripsProps {
  trips: TripEntry[];
  loading: boolean;
  onRefresh: () => void;
}

export function TodayTrips({ trips, loading, onRefresh }: TodayTripsProps) {
  const [dateString, setDateString] = useState("");

  useEffect(() => {
    setDateString(new Date().toLocaleDateString("ar-EG"));
  }, []);
  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
      DEPARTED: "bg-blue-50 text-blue-700 border-blue-200",
      ARRIVED: "bg-green-50 text-green-700 border-green-200",
      DELAYED: "bg-orange-50 text-orange-700 border-orange-200",
      CANCELLED: "bg-red-50 text-red-700 border-red-200",
    };
    const labels = {
      PENDING: "قيد الانتظار",
      DEPARTED: "غادر",
      ARRIVED: "وصل",
      DELAYED: "متأخر",
      CANCELLED: "ملغي",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <Card className="bg-white border-slate-200 shadow-sm mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-900">رحلات اليوم</CardTitle>
            <CardDescription className="text-slate-600">
              {dateString} - {trips.length} رحلة
            </CardDescription>
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
          >
            <RefreshCcw
              className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trips.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-right">
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الوقت
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الاتجاه
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الجامعة
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الحي
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الباص
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      السائق
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الطلاب
                    </th>
                    <th className="pb-3 pr-2 font-semibold text-slate-600">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 pr-2 text-slate-700 font-medium">
                        {trip.tripTime}
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            trip.direction === "GO"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-purple-50 text-purple-600 border border-purple-200"
                          }`}
                        >
                          {trip.direction === "GO" ? "ذهاب" : "عودة"}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-slate-700">
                        {trip.route?.university?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-2 text-slate-700">
                        {trip.route?.districts?.length > 0
                          ? trip.route.districts
                              .map((d: any) => d.name)
                              .join("، ")
                          : trip.route?.district?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-2 text-slate-700">
                        {trip.route?.bus?.busNumber ?? "-"}
                      </td>
                      <td className="py-3 pr-2 text-slate-700">
                        {trip.route?.driver?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-2 text-slate-700 font-bold">
                        {trip.studentsCount}
                      </td>
                      <td className="py-3 pr-2">
                        {getStatusBadge(trip.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {trips.map((trip) => (
                <MobileTripCard
                  key={trip.id}
                  trip={trip}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">لا توجد رحلات مسجلة اليوم</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
