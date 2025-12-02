export interface District {
  id: string;
  name: string;
  description?: string | null;
}

export interface RouteEntity {
  id: string;
  university?: { id: string; name: string } | null;
  driver?: { id: string; name: string; phone?: string | null } | null;
  bus?: {
    id: string;
    busNumber: string;
    capacity?: number;
  } | null;
  representative?: { id: string; name: string } | null;
  district?: District | null;
  districts?: District[];
}

export interface TripEntry {
  id: string;
  routeId?: string;
  tripDate: string;
  direction: "GO" | "RETURN";
  tripTime: string;
  studentsCount: number;
  status: "PENDING" | "DEPARTED" | "ARRIVED" | "DELAYED" | "CANCELLED";
  source?: string;
  notes?: string | null;
  route?: RouteEntity | null;
}
