import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Bus, Clock, Users, ArrowRightLeft } from "lucide-react";

interface MobileTripCardProps {
  trip: {
    id: string;
    tripTime: string;
    direction: string;
    status: string;
    studentsCount: number;
    district?: { name: string } | null;
    route?: {
      university?: { name: string } | null;
      driver?: { name: string } | null;
      bus?: {
        busNumber: string;
        bus_number?: string;
        districts?: { name: string }[];
      } | null;
    } | null;
  };
  getStatusBadge: (status: string) => React.ReactNode;
}

export function MobileTripCard({ trip, getStatusBadge }: MobileTripCardProps) {
  return (
    <Card className="mb-4 bg-white border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header: Time & Status */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900 text-lg">
              {trip.tripTime}
            </span>
          </div>
          {getStatusBadge(trip.status)}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* University */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>الجامعة</span>
            </div>
            <p className="text-slate-900 font-medium truncate">
              {trip.route?.university?.name || "-"}
            </p>
          </div>

          {/* District */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>الحي</span>
            </div>
            <p className="text-slate-900 font-medium truncate">
              {trip.route?.districts?.length > 0
                ? trip.route.districts.map((d: any) => d.name).join("، ")
                : trip.route?.district?.name || "-"}
            </p>
          </div>

          {/* Driver */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500">
              <User className="w-3 h-3" />
              <span>السائق</span>
            </div>
            <p className="text-slate-900 font-medium truncate">
              {trip.route?.driver?.name || "-"}
            </p>
          </div>

          {/* Bus */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500">
              <Bus className="w-3 h-3" />
              <span>الباص</span>
            </div>
            <p className="text-slate-900 font-medium truncate">
              {trip.route?.bus?.busNumber || trip.route?.bus?.bus_number || "-"}
            </p>
          </div>
        </div>

        {/* Footer: Students & Direction */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 bg-slate-50 -mx-4 -mb-4 p-3 mt-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-slate-900 font-medium">
              {trip.studentsCount} طالب
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-purple-600" />
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                trip.direction === "GO"
                  ? "text-blue-700 bg-blue-50 border border-blue-200"
                  : "text-purple-700 bg-purple-50 border border-purple-200"
              }`}
            >
              {trip.direction === "GO" ? "ذهاب" : "عودة"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
