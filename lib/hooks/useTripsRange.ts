import useSWR from "swr";

interface Trip {
  id: string;
  tripDate: string;
  direction: string;
  tripTime: string;
  studentsCount: number;
  status: string;
  notes: string | null;
  source: string;
  route: {
    bus: { id: string; busNumber: string } | null;
    driver: { id: string; name: string; phone: string | null } | null;
    university: { id: string; name: string } | null;
    district: { id: string; name: string } | null;
  };
}

interface TripsRangeOptions {
  startDate: string;
  endDate: string;
  routeId?: string;
  status?: string;
  direction?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("فشل جلب الرحلات للفترة المحددة");
  return res.json();
};

export function useTripsRange(opts: TripsRangeOptions) {
  const params = new URLSearchParams();
  params.set("startDate", opts.startDate);
  params.set("endDate", opts.endDate);
  if (opts.routeId) params.set("routeId", opts.routeId);
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  if (opts.direction) params.set("direction", opts.direction);

  const key = `/Performance/api/trips?${params.toString()}`;

  const { data, error, mutate, isLoading, isValidating } = useSWR<Trip[]>(
    key,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      dedupingInterval: 10_000, // تجنب الطلبات المتكررة خلال 10 ثواني
      keepPreviousData: true, // إبقاء البيانات السابقة أثناء التحميل
    }
  );

  // تجميع الرحلات حسب اليوم
  const byDate: Record<string, Trip[]> = {};
  if (Array.isArray(data)) {
    for (const trip of data) {
      const dayKey = trip.tripDate.split("T")[0];
      if (!byDate[dayKey]) byDate[dayKey] = [];
      byDate[dayKey].push(trip);
    }
  }

  const dailySummary = Object.entries(byDate).map(([date, trips]) => {
    const statusCounts: Record<string, number> = {};
    let students = 0;
    for (const t of trips) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      students += t.studentsCount || 0;
    }
    return { date, trips, statusCounts, students };
  });

  return {
    trips: Array.isArray(data) ? data : [],
    dailySummary,
    isLoading,
    isValidating, // للتحديث في الخلفية
    isError: !!error,
    error,
    refresh: mutate,
  };
}
