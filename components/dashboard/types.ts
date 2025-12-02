export interface Statistics {
  totals: {
    totalTrips: number;
    totalStudents: number;
    totalUniversities?: number;
    totalDrivers?: number;
    totalBuses?: number;
    totalDistricts?: number;
  };
  statusCounts: Record<string, number>;
  driversPerformance: Array<{
    driverId: string;
    name: string;
    trips: number;
    arrived?: number;
    performancePercentage: number;
  }>;
  universitiesActivity: Array<{
    universityId: string;
    name: string;
    trips: number;
    students: number;
  }>;
}

export interface District {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
  tripDate: string;
  direction: "GO" | "RETURN";
  tripTime: string;
  studentsCount: number;
  status: "PENDING" | "DEPARTED" | "ARRIVED" | "DELAYED" | "CANCELLED";
  source?: string;
  notes?: string | null;
  route?: {
    id?: string;
    bus?: {
      id: string;
      busNumber: string;
    } | null;
    driver?: {
      id: string;
      name: string;
      phone?: string | null;
    } | null;
    university?: {
      id: string;
      name: string;
    } | null;
    district?: District | null;
    districts?: District[];
  } | null;
}
