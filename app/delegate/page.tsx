import { prisma } from "@/lib/prisma";
import DelegateClient from "./delegate-client";
import { RouteEntity, TripEntry, District } from "@/components/delegate/types";

// Force dynamic rendering since we depend on current date/time
export const dynamic = "force-dynamic";

async function getRoutes(): Promise<RouteEntity[]> {
  const routes = await prisma.route.findMany({
    where: { isActive: true },
    include: {
      university: true,
      driver: true,
      bus: {
        include: {
          districts: {
            include: {
              district: true,
            },
          },
        },
      },
      district: true,
    },
  });

  // Transform to match RouteEntity interface
  return JSON.parse(JSON.stringify(routes));
}

async function getDistricts(): Promise<District[]> {
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
  });
  return JSON.parse(JSON.stringify(districts));
}

async function getTodayTrips(): Promise<TripEntry[]> {
  // Build UTC start/end of today
  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = new Date(todayStr);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(todayStr);
  endDate.setUTCHours(23, 59, 59, 999);

  // جلب من جدول RouteTrip (المصدر الرئيسي)
  const routeTrips = await prisma.routeTrip.findMany({
    where: {
      tripDate: { gte: startDate, lte: endDate },
    },
    include: {
      route: {
        include: {
          university: true,
          driver: true,
          bus: {
            include: {
              districts: {
                include: { district: true },
              },
            },
          },
          district: true,
        },
      },
    },
    orderBy: [{ tripDate: "desc" }, { tripTime: "asc" }],
  });

  // تحويل البيانات للصيغة المطلوبة
  const transformedTrips = routeTrips.map((rt) => {
    const districtsFromBus =
      rt.route?.bus?.districts?.map((d) => d.district) || [];
    const district = rt.route?.district || districtsFromBus[0] || null;
    const districts = rt.route?.district
      ? [rt.route.district]
      : districtsFromBus;

    return {
      id: rt.id,
      routeId: rt.routeId,
      tripDate: rt.tripDate.toISOString(),
      direction: rt.direction,
      tripTime: rt.tripTime,
      studentsCount: rt.studentsCount,
      status: rt.status,
      source: "route_trips",
      route: {
        id: rt.route?.id,
        university: rt.route?.university,
        driver: rt.route?.driver,
        bus: rt.route?.bus
          ? { id: rt.route.bus.id, busNumber: rt.route.bus.busNumber }
          : null,
        district: district,
        districts: districts,
      },
    };
  });

  return JSON.parse(JSON.stringify(transformedTrips));
}

export default async function DelegatePage() {
  const [routes, districts, trips] = await Promise.all([
    getRoutes(),
    getDistricts(),
    getTodayTrips(),
  ]);

  return (
    <DelegateClient
      initialRoutes={routes}
      initialDistricts={districts}
      initialTrips={trips}
    />
  );
}
