import { prisma } from "@/lib/prisma";
import DelegateClient from "./delegate-client";
import { RouteEntity, TripEntry, District } from "@/components/delegate/types";

// Force dynamic rendering since we depend on current date/time
export const dynamic = "force-dynamic";

async function getRoutes(): Promise<RouteEntity[]> {
  const routes = await prisma.route.findMany({
    where: { isActive: true },
    select: {
      id: true,
      university: { select: { id: true, name: true } },
      driver: { select: { id: true, name: true, phone: true } },
      bus: {
        select: {
          id: true,
          busNumber: true,
          capacity: true,
          districts: {
            select: { district: { select: { id: true, name: true } } },
          },
        },
      },
      district: { select: { id: true, name: true, description: true } },
    },
  });

  return routes.map((route) => ({
    id: route.id,
    university: route.university,
    driver: route.driver,
    bus: {
      id: route.bus.id,
      busNumber: route.bus.busNumber,
      capacity: route.bus.capacity,
    },
    district: route.district,
    districts: route.district
      ? [route.district]
      : route.bus.districts.map((item) => item.district),
  }));
}

async function getDistricts(): Promise<District[]> {
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
  });
  return JSON.parse(JSON.stringify(districts));
}

async function getTodayTrips() {
  // Build UTC start/end of today
  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = new Date(todayStr);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(todayStr);
  endDate.setUTCHours(23, 59, 59, 999);

  return prisma.routeTrip.findMany({
    where: {
      tripDate: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      routeId: true,
      tripDate: true,
      direction: true,
      tripTime: true,
      studentsCount: true,
      status: true,
    },
    orderBy: [{ tripDate: "desc" }, { tripTime: "asc" }],
  });
}

export default async function DelegatePage() {
  const [routes, districts, rawTrips] = await Promise.all([
    getRoutes(),
    getDistricts(),
    getTodayTrips(),
  ]);
  const routeMap = new Map(routes.map((route) => [route.id, route]));
  const trips: TripEntry[] = rawTrips.map((trip) => ({
    ...trip,
    tripDate: trip.tripDate.toISOString(),
    source: "route_trips",
    route: routeMap.get(trip.routeId) ?? null,
  }));

  return (
    <DelegateClient
      initialRoutes={routes}
      initialDistricts={districts}
      initialTrips={trips}
    />
  );
}
