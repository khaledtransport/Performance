/**
 * GET /api/tracking/stream
 * ========================
 * Server-Sent Events (SSE) — يدفع بيانات التتبع للعميل كل 3 ثوانٍ
 * بدلاً من polling كل 2 ثانية من العميل
 * 
 * مزايا SSE:
 * - اتصال واحد يبقى مفتوحاً (لا HTTP overhead لكل طلب)
 * - المتصفح يعيد الاتصال تلقائياً عند الانقطاع
 * - أقل ضغطاً على قاعدة البيانات
 *
 * ملاحظة Vercel: الاتصال يُغلق بعد ~25 ثانية (serverless limit)
 * EventSource في المتصفح يعيد الاتصال تلقائياً — هذا طبيعي وصحيح
 */

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { TRACKING_VIEW_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge لا يدعم Prisma

type LatestPoint = {
  bus_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: Date;
};

type TrackingBus = {
  id: string;
  busNumber: string;
  createdAt: Date;
  districts: Array<{ district: { name: string } }>;
};

let busCache: { data: TrackingBus[]; expiresAt: number } | null = null;

async function getActiveBuses(): Promise<TrackingBus[]> {
  if (busCache && busCache.expiresAt > Date.now()) return busCache.data;

  const buses = await prisma.bus.findMany({
    where: { isActive: true },
    select: {
      id: true,
      busNumber: true,
      createdAt: true,
      districts: { select: { district: { select: { name: true } } } },
    },
    orderBy: { busNumber: "asc" },
  });
  busCache = { data: buses, expiresAt: Date.now() + 60_000 };
  return buses;
}

async function loadBusLocations() {
  const now = Date.now();
  const activeThreshold = new Date(now - 30 * 1000);

  const [activeSessions, buses] = await Promise.all([
    prisma.trackingSession.findMany({
      where: { status: "ACTIVE", endedAt: null, lastPointAt: { gte: activeThreshold } },
      select: { busId: true },
    }),
    getActiveBuses(),
  ]);

  const activeBusSet = new Set(activeSessions.map((s) => s.busId));

  // أحدث نقطة لكل باص (DISTINCT ON — استعلام واحد)
  const latestTPRaw = await prisma.$queryRaw<LatestPoint[]>`
    SELECT DISTINCT ON (bus_id) bus_id, latitude, longitude, speed, heading, accuracy, timestamp
    FROM tracking_points
    ORDER BY bus_id, timestamp DESC
  `;
  const latestTP = new Map(latestTPRaw.map((p) => [p.bus_id, p]));

  // Fallback للبيانات القديمة (BusLocation)
  const busesWithoutTP = buses.filter((b) => !latestTP.has(b.id)).map((b) => b.id);
  const latestBLMap = new Map<string, LatestPoint>();
  if (busesWithoutTP.length > 0) {
    try {
      const rows = await prisma.$queryRaw<LatestPoint[]>`
        SELECT DISTINCT ON (bus_id) bus_id, latitude, longitude, speed, heading, accuracy, timestamp
        FROM bus_locations
        WHERE bus_id = ANY(${busesWithoutTP}::text[])
        ORDER BY bus_id, timestamp DESC
      `;
      for (const r of rows) latestBLMap.set(r.bus_id, r);
    } catch { /* صامت */ }
  }

  return buses.map((bus) => {
    const tp = latestTP.get(bus.id) ?? latestBLMap.get(bus.id) ?? null;
    return {
      busId: bus.id,
      busNumber: bus.busNumber,
      district: bus.districts[0]?.district?.name || "غير محدد",
      latitude: tp?.latitude ?? 21.4858,
      longitude: tp?.longitude ?? 39.1925,
      speed: tp?.speed ?? 0,
      heading: tp?.heading ?? null,
      accuracy: tp?.accuracy ?? null,
      lastUpdate: tp?.timestamp ?? bus.createdAt,
      isOnline: activeBusSet.has(bus.id),
      hasLocation: tp !== null,
      isCellTower: tp?.accuracy != null && (tp.accuracy as number) >= 300,
    };
  });
}

type BusLocations = Awaited<ReturnType<typeof loadBusLocations>>;
let locationsCache: { data: BusLocations; expiresAt: number } | null = null;
let locationsInFlight: Promise<BusLocations> | null = null;

async function getBusLocations(): Promise<BusLocations> {
  if (locationsCache && locationsCache.expiresAt > Date.now()) {
    return locationsCache.data;
  }
  if (locationsInFlight) return locationsInFlight;

  locationsInFlight = loadBusLocations()
    .then((data) => {
      locationsCache = { data, expiresAt: Date.now() + 2_800 };
      return data;
    })
    .finally(() => {
      locationsInFlight = null;
    });
  return locationsInFlight;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(TRACKING_VIEW_ROLES);
  if (auth.response) return auth.response;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let fetching = false;
      let timer: ReturnType<typeof setInterval> | null = null;
      let eventId = 0;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          eventId++;
          // إرسال id + retry لتسريع إعادة الاتصال التلقائي
          controller.enqueue(encoder.encode(`id: ${eventId}\nretry: 1000\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const fetchAndSend = async () => {
        if (closed || fetching) return;
        fetching = true;
        try {
          const locations = await getBusLocations();
          send(locations);
        } catch (e) {
          // لا تُوقف الـ stream عند خطأ transient
          console.error("SSE fetch error:", e);
        } finally {
          fetching = false;
        }
      };

      // إرسال فوري عند الاتصال
      await fetchAndSend();

      // دورة واحدة فقط في كل مرة؛ يمنع تراكم الاستعلامات عند بطء الشبكة.
      timer = setInterval(fetchAndSend, 3000);

      // إغلاق بعد 24 ثانية (قبل Vercel 25s limit) — EventSource يعيد الاتصال تلقائياً
      const closeTimer = setTimeout(() => {
        closed = true;
        if (timer) clearInterval(timer);
        try { controller.close(); } catch { /* already closed */ }
      }, 24000);

      // إغلاق عند قطع الاتصال من العميل
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearTimeout(closeTimer);
        if (timer) clearInterval(timer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // تعطيل buffering في nginx/Vercel
    },
  });
}
