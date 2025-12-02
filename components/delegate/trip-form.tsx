"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Clock } from "lucide-react";
import { District, RouteEntity } from "./types";

interface TripFormProps {
    routes: RouteEntity[];
    onSubmit: (data: any) => Promise<void>;
    loading: boolean;
}

export function TripForm({ routes, onSubmit, loading }: TripFormProps) {
    const [selectedRoute, setSelectedRoute] = useState("");
    const [tripDate, setTripDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [direction, setDirection] = useState<"GO" | "RETURN">("GO");
    const [tripTime, setTripTime] = useState("");
    const [studentsCount, setStudentsCount] = useState(0);
    const [status, setStatus] = useState<
        "PENDING" | "DEPARTED" | "ARRIVED" | "DELAYED" | "CANCELLED"
    >("DEPARTED");
    const [notes, setNotes] = useState("");

    // Generate time slots from 6:00 AM to 11:00 PM with 30-minute intervals
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 6; hour <= 23; hour++) {
            const period = hour >= 12 ? "PM" : "AM";
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            slots.push(`${displayHour}:00 ${period}`);
            slots.push(`${displayHour}:30 ${period}`);
        }
        return slots;
    };

    const allTimeSlots = generateTimeSlots();

    // وقت الذهاب: من 6:00 صباحًا إلى 12:00 ظهرًا
    const goTimes = allTimeSlots.filter((time) => {
        const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return false;
        const [, hourStr, , period] = match;
        const hour = parseInt(hourStr);
        if (period === 'AM') return hour >= 6;
        if (period === 'PM') return hour === 12;
        return false;
    });

    // وقت العودة: من 12:00 ظهرًا إلى 11:00 مساءً
    const returnTimes = allTimeSlots.filter((time) => {
        const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return false;
        const [, hourStr, , period] = match;
        const hour = parseInt(hourStr);
        return period === 'PM';
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            routeId: selectedRoute,
            tripDate,
            direction,
            tripTime,
            studentsCount,
            status,
            notes,
        });
        // Reset some fields after success if needed, but parent handles success state usually.
        // We can reset here if we want.
        setStudentsCount(0);
        setNotes("");
        setTripTime("");
    };

    const selectedRouteData = routes.find((r) => r.id === selectedRoute);

    return (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="text-2xl text-slate-900">تسجيل رحلة جديدة</CardTitle>
                <CardDescription className="text-slate-600">
                    قم بتعبئة البيانات التالية لتسجيل رحلة
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Route Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="route" className="text-slate-700">
                            اختر الرحلة الأساسية *
                        </Label>
                        <Select id="route" value={selectedRoute} onValueChange={setSelectedRoute} required>
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="اختر رحلة..." />
                            </SelectTrigger>
                            <SelectContent>
                                {routes.map((route) => (
                                    <SelectItem key={route.id} value={route.id}>
                                        {route.university?.name || "بدون جامعة"} -{" "}
                                        {route.driver?.name || "بدون سائق"} -{" "}
                                        {route.bus?.busNumber || "بدون باص"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Trip Details Card */}
                    {selectedRouteData && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-600 mb-1 text-xs">الجامعة</p>
                                    <p className="font-semibold text-slate-900">
                                        {selectedRouteData.university?.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-600 mb-1 text-xs">السائق</p>
                                    <p className="font-semibold text-slate-900">
                                        {selectedRouteData.driver?.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-600 mb-1 text-xs">الباص</p>
                                    <p className="font-semibold text-slate-900">
                                        {selectedRouteData.bus?.busNumber}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-600 mb-1 text-xs">المندوب</p>
                                    <p className="font-semibold text-slate-900">
                                        {selectedRouteData.representative?.name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date and Direction */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date" className="text-slate-700">
                                التاريخ *
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={tripDate}
                                onChange={(e) => setTripDate(e.target.value)}
                                required
                                className="bg-white border-slate-200 text-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="direction" className="text-slate-700">
                                الاتجاه *
                            </Label>
                            <Select
                                value={direction}
                                onValueChange={(v: any) => setDirection(v)}
                                required
                            >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GO">ذهاب</SelectItem>
                                    <SelectItem value="RETURN">عودة</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="time" className="text-slate-700">
                            الوقت *
                        </Label>
                        <Select value={tripTime} onValueChange={setTripTime} required>
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="اختر الوقت..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(direction === "GO" ? goTimes : returnTimes).map((time) => (
                                    <SelectItem key={time} value={time}>
                                        {time}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Students Count and Status */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="students" className="text-slate-700">
                                عدد الطلاب *
                            </Label>
                            <Input
                                id="students"
                                type="number"
                                min="0"
                                value={studentsCount}
                                onChange={(e) =>
                                    setStudentsCount(parseInt(e.target.value) || 0)
                                }
                                required
                                className="bg-white border-slate-200 text-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-slate-700">
                                حالة الرحلة *
                            </Label>
                            <Select
                                value={status}
                                onValueChange={(v: any) => setStatus(v)}
                                required
                            >
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                                    <SelectItem value="DEPARTED">غادر</SelectItem>
                                    <SelectItem value="ARRIVED">وصل</SelectItem>
                                    <SelectItem value="DELAYED">متأخر</SelectItem>
                                    <SelectItem value="CANCELLED">ملغي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-slate-700">
                            ملاحظات
                        </Label>
                        <Input
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="أي ملاحظات إضافية..."
                            className="bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6 text-lg shadow-lg hover:shadow-blue-900/20 transition-all"
                        disabled={loading || !selectedRoute || !tripTime}
                    >
                        {loading ? (
                            <>
                                <Clock className="w-5 h-5 ml-2 animate-spin" />
                                جاري التسجيل...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5 ml-2" />
                                تسجيل الرحلة
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
