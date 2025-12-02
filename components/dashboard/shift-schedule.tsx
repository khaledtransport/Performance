import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Clock,
  MapPin,
  User,
  Bus as BusIcon,
  Users,
  Maximize2,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trip } from "./types";
import { cn } from "@/lib/utils";

interface ShiftScheduleProps {
  trips: Trip[];
}

export function ShiftSchedule({ trips }: ShiftScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate time slots from 6:00 AM to 11:00 PM
  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = 6;
    const endHour = 23;

    for (let hour = startHour; hour <= endHour; hour++) {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

      slots.push({
        display: `${displayHour}:00 ${period}`,
        hour: hour,
        minute: 0,
      });
      slots.push({
        display: `${displayHour}:30 ${period}`,
        hour: hour,
        minute: 30,
      });
    }
    return slots;
  }, []);

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    DEPARTED: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    ARRIVED: "bg-green-50 border-green-200 hover:bg-green-100",
    DELAYED: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    CANCELLED: "bg-red-50 border-red-200 hover:bg-red-100",
  };

  const statusBadges: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    DEPARTED: "bg-blue-100 text-blue-800 border-blue-300",
    ARRIVED: "bg-green-100 text-green-800 border-green-300",
    DELAYED: "bg-orange-100 text-orange-800 border-orange-300",
    CANCELLED: "bg-red-100 text-red-800 border-red-300",
  };

  const statusArabic: Record<string, string> = {
    PENDING: "قيد الانتظار",
    DEPARTED: "غادرت",
    ARRIVED: "وصلت",
    DELAYED: "متأخرة",
    CANCELLED: "ملغاة",
  };

  const isTimeInSlot = (
    tripTime: string,
    slotHour: number,
    slotMinute: number
  ) => {
    // tripTime comes as "HH:mm" (24h format) from API
    if (!tripTime) return false;

    const [h, m] = tripTime.split(":").map(Number);

    // Match exact hour
    if (h !== slotHour) return false;

    // Match minutes: 0-29 goes to :00 slot, 30-59 goes to :30 slot
    if (slotMinute === 0) {
      return m < 30;
    } else {
      return m >= 30;
    }
  };

  // Export to Excel function
  const exportToExcel = async () => {
    // Dynamic import for xlsx
    const XLSX = await import("xlsx");

    // Create workbook
    const wb = XLSX.utils.book_new();

    // All time slots in one row
    const allData: any[] = [];

    // Header row with all times
    allData.push(timeSlots.map((slot) => slot.display));

    // Find max rows needed
    const maxRows = Math.max(
      ...timeSlots.map((slot) => {
        const slotTrips = trips.filter((t) =>
          isTimeInSlot(t.tripTime, slot.hour, slot.minute)
        );
        return slotTrips.length > 0 ? slotTrips.length : 1;
      })
    );

    // Build data rows with trip info and status
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      const row: any[] = [];
      timeSlots.forEach((slot) => {
        const slotTrips = trips.filter((t) =>
          isTimeInSlot(t.tripTime, slot.hour, slot.minute)
        );
        if (rowIdx < slotTrips.length) {
          const trip = slotTrips[rowIdx];
          row.push({
            v: `${trip.route?.university?.name || "-"}\n${
              trip.route?.districts?.map((d: any) => d.name).join("، ") || "-"
            }\n${trip.route?.driver?.name || "-"}\n${
              trip.route?.bus?.busNumber || "-"
            }\n👥${trip.studentsCount || 0}\n${
              trip.direction === "GO" ? "ذهاب" : "عودة"
            }\n${
              statusArabic[trip.status as keyof typeof statusArabic] ||
              trip.status
            }`,
            s: {
              alignment: {
                vertical: "top",
                horizontal: "right",
                wrapText: true,
              },
              fill: {
                type: "pattern",
                patternType: "solid",
                fgColor: {
                  rgb:
                    trip.status === "DELAYED"
                      ? "FFCC99"
                      : trip.status === "ARRIVED"
                      ? "90EE90"
                      : trip.status === "CANCELLED"
                      ? "FF9999"
                      : trip.status === "DEPARTED"
                      ? "ADD8E6"
                      : trip.status === "PENDING"
                      ? "FFEB99"
                      : "FFFFFF",
                },
              },
            },
          });
        } else {
          row.push({
            v: "-",
            s: {
              alignment: {
                vertical: "top",
                horizontal: "center",
                wrapText: true,
              },
              fill: {
                type: "pattern",
                patternType: "solid",
                fgColor: { rgb: "FFFFFF" },
              },
            },
          });
        }
      });
      allData.push(row);
    }

    // Create sheet with proper object formatting
    const ws = XLSX.utils.sheet_add_aoa(
      XLSX.utils.book_new().SheetNames ? {} : {},
      [timeSlots.map((s) => s.display)]
    );

    // Manual sheet creation
    const newWs: any = {};

    // Add header
    timeSlots.forEach((slot, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
      newWs[cellRef] = {
        v: slot.display,
        s: {
          font: { bold: true },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
          fill: {
            type: "pattern",
            patternType: "solid",
            fgColor: { rgb: "E6E6E6" },
          },
        },
      };
    });

    // Add data with formatting
    for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
      timeSlots.forEach((slot, colIdx) => {
        const slotTrips = trips.filter((t) =>
          isTimeInSlot(t.tripTime, slot.hour, slot.minute)
        );

        const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });

        if (rowIdx < slotTrips.length) {
          const trip = slotTrips[rowIdx];
          const bgColor =
            trip.status === "DELAYED"
              ? "FFCC99"
              : trip.status === "ARRIVED"
              ? "90EE90"
              : trip.status === "CANCELLED"
              ? "FF9999"
              : trip.status === "DEPARTED"
              ? "ADD8E6"
              : trip.status === "PENDING"
              ? "FFEB99"
              : "FFFFFF";

          newWs[cellRef] = {
            v: `${trip.route?.university?.name || "-"}\n${
              trip.route?.districts?.map((d: any) => d.name).join("، ") || "-"
            }\n${trip.route?.driver?.name || "-"}\n${
              trip.route?.bus?.busNumber || "-"
            }\n👥${trip.studentsCount || 0}\n${
              trip.direction === "GO" ? "ذهاب" : "عودة"
            }\n${
              statusArabic[trip.status as keyof typeof statusArabic] ||
              trip.status
            }`,
            s: {
              alignment: {
                vertical: "top",
                horizontal: "right",
                wrapText: true,
              },
              fill: {
                type: "pattern",
                patternType: "solid",
                fgColor: { rgb: bgColor },
              },
            },
          };
        } else {
          newWs[cellRef] = {
            v: "-",
            s: {
              alignment: {
                vertical: "top",
                horizontal: "center",
                wrapText: true,
              },
              fill: {
                type: "pattern",
                patternType: "solid",
                fgColor: { rgb: "FFFFFF" },
              },
            },
          };
        }
      });
    }

    // Set dimensions
    newWs["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: maxRows, c: timeSlots.length - 1 },
    });
    newWs["!cols"] = timeSlots.map(() => ({ wch: 25 }));
    newWs["!rows"] = Array(maxRows + 1).fill({ hpt: 80 });

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, newWs, "جدول الرحلات");

    // Write file
    XLSX.writeFile(
      wb,
      `جدول-الرحلات-${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const ScheduleContent = useMemo(() => {
    return () => (
      <div className="overflow-x-auto pb-2 h-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="flex min-w-max px-2 h-full">
          {timeSlots.map((slot) => {
            const slotTrips = trips.filter((t) =>
              isTimeInSlot(t.tripTime, slot.hour, slot.minute)
            );

            return (
              <div
                key={slot.display}
                className="flex-shrink-0 w-48 border-l border-slate-100 last:border-l-0 px-1 h-full overflow-y-auto"
              >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-1.5 mb-1 text-center border-b border-slate-200 rounded-t shadow-sm">
                  <span
                    className="text-sm font-bold text-slate-800 block"
                    dir="ltr"
                  >
                    {slot.display}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {slotTrips.length} رحلات
                  </span>
                </div>

                {/* Trips Column */}
                <div className="space-y-1.5 min-h-[150px] pb-2">
                  {slotTrips.length > 0 ? (
                    slotTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className={`p-2 rounded border transition-all shadow-sm hover:shadow-md ${
                          statusColors[trip.status] ||
                          "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span
                            className={`text-[9px] px-1 py-0.5 rounded border font-bold ${
                              trip.direction === "GO"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-purple-100 text-purple-700 border-purple-200"
                            }`}
                          >
                            {trip.direction === "GO" ? "ذهاب" : "عودة"}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.5 rounded border font-bold ${
                              statusBadges[trip.status]
                            }`}
                          >
                            {statusArabic[trip.status] || trip.status}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                            <p
                              className="text-xs font-bold text-slate-800 truncate"
                              title={trip.route?.university?.name}
                            >
                              {trip.route?.university?.name}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                            <p
                              className="text-[10px] text-slate-500 truncate"
                              title={trip.route?.districts
                                ?.map((d: any) => d.name)
                                .join(", ")}
                            >
                              {trip.route?.districts?.length > 0
                                ? trip.route.districts
                                    .map((d: any) => d.name)
                                    .join(", ")
                                : "-"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 pt-1 border-t border-slate-200/50 mt-1">
                            <User className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                            <p className="text-[10px] text-slate-600 truncate font-medium">
                              {trip.route?.driver?.name}
                            </p>
                          </div>

                          <div className="flex justify-between items-center pt-0.5">
                            <div className="flex items-center gap-1">
                              <BusIcon className="w-2.5 h-2.5 text-slate-400" />
                              <span className="text-[10px] text-slate-500 font-mono">
                                {trip.route?.bus?.busNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-2.5 h-2.5 text-green-600" />
                              <span className="text-[10px] text-green-700 font-bold">
                                {trip.studentsCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-16 flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-100 rounded bg-slate-50/30">
                      <span className="text-[9px] opacity-50">-</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [trips, timeSlots, isTimeInSlot, statusColors, statusArabic]);

  return (
    <>
      {/* Normal View */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              جدول الرحلات اليومي
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              عرض زمني للرحلات (6:00 ص - 11:00 م)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={exportToExcel}
              title="تصدير إلى Excel"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScheduleContent />
        </CardContent>
      </Card>

      {/* Expanded Modal View */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-50 rounded">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  جدول الرحلات الكامل
                </h2>
                <p className="text-[10px] text-slate-500">
                  عرض تفصيلي لجميع الأوقات
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={exportToExcel}
                title="تصدير إلى Excel"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:bg-slate-100 rounded-full w-8 h-8"
                onClick={() => setIsExpanded(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            <div className="space-y-6">
              {/* AM Section */}
              <div>
                <div className="px-4 py-2 bg-blue-100 border-b-2 border-blue-300 rounded mb-3">
                  <h3 className="font-bold text-blue-900 text-lg">
                    ☀️ صباحاً (AM)
                  </h3>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {timeSlots
                    .filter((slot) => slot.hour < 12)
                    .map((slot) => {
                      const slotTrips = trips.filter((t) =>
                        isTimeInSlot(t.tripTime, slot.hour, slot.minute)
                      );

                      return (
                        <div
                          key={slot.display}
                          className="border border-slate-100 rounded bg-white p-3"
                        >
                          {/* Header */}
                          <div className="text-center border-b border-slate-200 pb-2 mb-2">
                            <span
                              className="text-base font-bold text-slate-800 block"
                              dir="ltr"
                            >
                              {slot.display}
                            </span>
                            <span className="text-sm text-slate-500">
                              {slotTrips.length}
                            </span>
                          </div>

                          {/* Trips Column */}
                          <div className="space-y-2">
                            {slotTrips.length > 0 ? (
                              slotTrips.map((trip) => (
                                <div
                                  key={trip.id}
                                  className={`p-3 rounded text-sm border ${
                                    statusColors[trip.status] ||
                                    "bg-white border-slate-200"
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded border font-bold ${
                                        trip.direction === "GO"
                                          ? "bg-blue-100 text-blue-700 border-blue-200"
                                          : "bg-purple-100 text-purple-700 border-purple-200"
                                      }`}
                                    >
                                      {trip.direction === "GO"
                                        ? "ذهاب"
                                        : "عودة"}
                                    </span>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded border font-bold ${
                                        statusBadges[trip.status]
                                      }`}
                                    >
                                      {statusArabic[trip.status] || trip.status}
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <p
                                      className="text-sm font-bold text-slate-800 truncate"
                                      title={trip.route?.university?.name}
                                    >
                                      {trip.route?.university?.name}
                                    </p>
                                    <p
                                      className="text-xs text-slate-500 truncate"
                                      title={trip.route?.districts
                                        ?.map((d: any) => d.name)
                                        .join(", ")}
                                    >
                                      {trip.route?.districts?.length > 0
                                        ? trip.route.districts
                                            .map((d: any) => d.name)
                                            .join(", ")
                                        : "-"}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {trip.route?.driver?.name}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                      <span>{trip.route?.bus?.busNumber}</span>
                                      <span className="font-bold text-green-700">
                                        {trip.studentsCount}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="h-16 flex items-center justify-center text-slate-200">
                                <span className="text-base">-</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* PM Section */}
              <div>
                <div className="px-4 py-2 bg-orange-100 border-b-2 border-orange-300 rounded mb-3">
                  <h3 className="font-bold text-orange-900 text-lg">
                    🌙 مساءً (PM)
                  </h3>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {timeSlots
                    .filter((slot) => slot.hour >= 12)
                    .map((slot) => {
                      const slotTrips = trips.filter((t) =>
                        isTimeInSlot(t.tripTime, slot.hour, slot.minute)
                      );

                      return (
                        <div
                          key={slot.display}
                          className="border border-slate-100 rounded bg-white p-3"
                        >
                          {/* Header */}
                          <div className="text-center border-b border-slate-200 pb-2 mb-2">
                            <span
                              className="text-base font-bold text-slate-800 block"
                              dir="ltr"
                            >
                              {slot.display}
                            </span>
                            <span className="text-sm text-slate-500">
                              {slotTrips.length}
                            </span>
                          </div>

                          {/* Trips Column */}
                          <div className="space-y-2">
                            {slotTrips.length > 0 ? (
                              slotTrips.map((trip) => (
                                <div
                                  key={trip.id}
                                  className={`p-3 rounded text-sm border ${
                                    statusColors[trip.status] ||
                                    "bg-white border-slate-200"
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded border font-bold ${
                                        trip.direction === "GO"
                                          ? "bg-blue-100 text-blue-700 border-blue-200"
                                          : "bg-purple-100 text-purple-700 border-purple-200"
                                      }`}
                                    >
                                      {trip.direction === "GO"
                                        ? "ذهاب"
                                        : "عودة"}
                                    </span>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded border font-bold ${
                                        statusBadges[trip.status]
                                      }`}
                                    >
                                      {statusArabic[trip.status] || trip.status}
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <p
                                      className="text-sm font-bold text-slate-800 truncate"
                                      title={trip.route?.university?.name}
                                    >
                                      {trip.route?.university?.name}
                                    </p>
                                    <p
                                      className="text-xs text-slate-500 truncate"
                                      title={trip.route?.districts
                                        ?.map((d: any) => d.name)
                                        .join(", ")}
                                    >
                                      {trip.route?.districts?.length > 0
                                        ? trip.route.districts
                                            .map((d: any) => d.name)
                                            .join(", ")
                                        : "-"}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {trip.route?.driver?.name}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                      <span>{trip.route?.bus?.busNumber}</span>
                                      <span className="font-bold text-green-700">
                                        {trip.studentsCount}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="h-16 flex items-center justify-center text-slate-200">
                                <span className="text-base">-</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
