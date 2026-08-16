"use client";

/**
 * map-tracker-v4.tsx — MapLibre GL (GeoJSON Layers)
 * ===================================================
 * نسخة احترافية: بدل DOM Markers → GeoJSON Source + Symbol/Circle Layers
 *
 * المزايا:
 * - GPU rendering لكل الأيقونات  → أداء ثابت مع أي عدد من الباصات
 * - setData() واحدة في كل RAF     → لا reflow، لا DOM mutations
 * - pulse حقيقي داخل MapLibre     → circle-radius متغيّر في الـ loop
 * - bearing بـ turf من آخر نقطتين + lerp سلس
 * - أسماء الشوارع عربية
 * - auto-fit على الباصات الحقيقية فقط (hasLocation)
 * - نفس Props الـ v2/v3 (drop-in)
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";

// ── RTL Text Plugin: يُستدعى مرة واحدة على مستوى المودول ──────────────────
// ضروري لعرض الخط العربي بشكل صحيح (من اليمين لليسار، غير مقلوب)
if (typeof window !== "undefined") {
  try {
    maplibregl.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
      true,
    );
  } catch {
    // سبق تفعيله — تجاهل
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BusLocation {
  busId: string;
  busNumber: string;
  district: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy?: number | null;
  lastUpdate: string;
  isOnline: boolean;
  hasLocation?: boolean;
  isCellTower?: boolean;
}

interface Props {
  locations: BusLocation[];
  selectedBus: string | null;
  onSelectBus: (busId: string) => void;
}

type FC = GeoJSON.FeatureCollection<GeoJSON.Point>;
type Feature = GeoJSON.Feature<GeoJSON.Point>;

// ─────────────────────────────────────────────────────────────────────────────
// حالة module-level
// ─────────────────────────────────────────────────────────────────────────────

let savedZoom = 13;
let savedCenter: [number, number] = [39.1925, 21.4858];
let firstFitDone = false;

// ─────────────────────────────────────────────────────────────────────────────
// حالة per-bus للـ interpolation
// ─────────────────────────────────────────────────────────────────────────────

interface BusAnim {
  current: [number, number];
  target: [number, number];
  prev: [number, number];       // النقطة السابقة (لحساب Hermite)
  bearing: number;
  targetBearing: number;        // الاتجاه المستهدف (للتنعيم)
  isOnline: boolean;
  lastUpdateMs: number;
  lastFrameMs: number;          // آخر frame للـ Dead Reckoning
  busNumber: string;
  district: string;
  speed: number | null;
  arrivalMs: number;            // متى وصل التحديث (لحساب وتيرة الحركة)
}

// ─── Hermite Spline Interpolation ─────────────────────────────────────────
// حركة منحنية سلسة بدل lerp خطي — مثل Uber/Careem
function hermiteInterp(t: number): number {
  // SmoothStep: 3t² - 2t³ (تسارع ثم تباطؤ)
  return t * t * (3 - 2 * t);
}

// ─── Dead Reckoning: تقدير الموقع عند غياب البيانات ──────────────────────
// يحرك الأيقونة بناءً على السرعة والاتجاه بدل التجمد
const DEAD_RECKONING_MAX_MS = 12000; // أقصى مدة تقدير (12 ثانية)
const DEG_TO_RAD = Math.PI / 180;

function deadReckon(
  pos: [number, number],
  bearingDeg: number,
  speedKmh: number | null,
  dtMs: number
): [number, number] {
  if (!speedKmh || speedKmh < 2 || dtMs <= 0) return pos;
  const speedMs = speedKmh / 3.6;
  const dist = speedMs * (dtMs / 1000);
  const R = 6371000;
  const bearingRad = bearingDeg * DEG_TO_RAD;
  const latRad = pos[1] * DEG_TO_RAD;
  const dLat = (dist * Math.cos(bearingRad)) / R;
  const dLng = (dist * Math.sin(bearingRad)) / (R * Math.cos(latRad));
  return [pos[0] + dLng / DEG_TO_RAD, pos[1] + dLat / DEG_TO_RAD];
}

// ─── تنعيم الاتجاه (Bearing Smoothing) لمنع الدوران المفاجئ ──────────────
function lerpAngle(from: number, to: number, t: number): number {
  let diff = ((to - from + 540) % 360) - 180;
  return ((from + diff * t) + 360) % 360;
}

// الوقت المتوقع بين التحديثات (لحساب نسبة t في Hermite)
const EXPECTED_UPDATE_INTERVAL_MS = 3500;

function getCartoTiles(dark: boolean): string[] {
  const style = dark ? "dark_all" : "light_all";
  return ["a", "b", "c", "d"].map(
    (subdomain) =>
      `https://${subdomain}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MapTrackerV4({ locations, selectedBus, onSelectBus }: Props) {
  const mapDivRef   = useRef<HTMLDivElement | null>(null);
  const mapRef      = useRef<maplibregl.Map | null>(null);
  const stateRef    = useRef(new Map<string, BusAnim>());
  const rafRef      = useRef<number | null>(null);
  const readyRef    = useRef(false);
  const pulseRef    = useRef(0);
  const popupRef    = useRef<maplibregl.Popup | null>(null);

  // ── مرجع للـ callbacks حتى لا تُعيد الـ RAF إنشاء الـ effect ──────────────
  const onSelectRef = useRef(onSelectBus);
  useEffect(() => { onSelectRef.current = onSelectBus; }, [onSelectBus]);

  const selectedRef = useRef(selectedBus);
  useEffect(() => { selectedRef.current = selectedBus; }, [selectedBus]);

  // ── تهيئة الخريطة (مرة واحدة) ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "osm-raster": {
            type: "raster",
            tiles: getCartoTiles(isDark),
            tileSize: 256,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [
          {
            id: "osm-raster-layer",
            type: "raster",
            source: "osm-raster",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: savedCenter,
      zoom: savedZoom,
      attributionControl: false,
      maxZoom: 20,
      minZoom: 5,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("moveend", () => {
      savedZoom = map.getZoom();
      const c = map.getCenter();
      savedCenter = [c.lng, c.lat];
    });

    map.on("load", async () => {
      // القاعدة Raster من OSM، لذلك أسماء الشوارع تُرسم من السيرفر مباشرة

      // ── حمّل أيقونة الباص (SVG → canvas → ImageData) ──────────────────
      const loadSvgAsImage = (url: string, w: number, h: number): Promise<ImageData> =>
        new Promise((resolve, reject) => {
          const img = new Image(w, h);
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, w, h);
            resolve(ctx.getImageData(0, 0, w, h));
          };
          img.onerror = reject;
          img.src = url;
        });

      let iconData: ImageData | HTMLImageElement | ImageBitmap;
      try {
        iconData = await loadSvgAsImage("/Performance/icons/bus-van-top.svg", 80, 140);
      } catch {
        // fallback: مستطيل أزرق بسيط
        const canvas = document.createElement("canvas");
        canvas.width = 24; canvas.height = 40;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#1A73E8";
        ctx.beginPath();
        ctx.roundRect(2, 2, 20, 36, 5);
        ctx.fill();
        iconData = ctx.getImageData(0, 0, 24, 40);
      }
      map.addImage("bus-icon", iconData, { sdf: false });

      // ── Source واحد لكل الباصات ─────────────────────────────────────────
      const empty: FC = { type: "FeatureCollection", features: [] };
      map.addSource("buses", { type: "geojson", data: empty });

      // ── Layer 1: Glow (circle تحت الأيقونة) ─────────────────────────────
      map.addLayer({
        id: "bus-glow",
        type: "circle",
        source: "buses",
        paint: {
          "circle-color": [
            "case",
            ["boolean", ["get", "live"], false],
            "rgba(16,185,129,0.28)",
            "rgba(239,68,68,0.22)",
          ],
          "circle-radius": 16,
          "circle-blur": 0.55,
          "circle-opacity": 0.85,
        },
      });

      // ── Layer 2: Pulse ring (متحرك في الـ RAF) ───────────────────────────
      map.addLayer({
        id: "bus-pulse",
        type: "circle",
        source: "buses",
        filter: ["boolean", ["get", "live"], false],
        paint: {
          "circle-color": "rgba(16,185,129,0)",
          "circle-stroke-color": "rgba(16,185,129,0.65)",
          "circle-stroke-width": 1.5,
          "circle-radius": 16,
          "circle-opacity": 0,
          "circle-stroke-opacity": 0.65,
        },
      });

      // ── Layer 3: أيقونة الباص (symbol) ─────────────────────────────────
      map.addLayer({
        id: "bus-icons",
        type: "symbol",
        source: "buses",
        layout: {
          "icon-image": "bus-icon",
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            10, 0.12,
            14, 0.22,
            17, 0.35,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
        },
      });

      // ── Layer 4: رقم الباص ──────────────────────────────────────────────
      map.addLayer({
        id: "bus-labels",
        type: "symbol",
        source: "buses",
        layout: {
          "text-field": ["get", "busNumber"],
          "text-font": ["Open Sans Semibold"],
          "text-size": 11,
          "text-offset": [0, 1.8],
          "text-anchor": "top",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#ffffff",
            "#0f172a",
          ],
          "text-halo-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#1A73E8",
            "rgba(255,255,255,0.95)",
          ],
          "text-halo-width": 7,
        },
      });

      const syncMapTheme = () => {
        const dark = document.documentElement.classList.contains("dark");
        const source = map.getSource("osm-raster") as maplibregl.RasterTileSource;
        source?.setTiles(getCartoTiles(dark));
        map.setPaintProperty("bus-labels", "text-color", [
          "case",
          ["boolean", ["get", "selected"], false],
          "#ffffff",
          dark ? "#f8fafc" : "#0f172a",
        ]);
        map.setPaintProperty(
          "bus-labels",
          "text-halo-color",
          dark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
        );
      };

      const themeObserver = new MutationObserver(syncMapTheme);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      map.once("remove", () => themeObserver.disconnect());

      // ── Click للاختيار + Popup ──────────────────────────────────────────
      map.on("click", "bus-icons", (e) => {
        const f = e.features?.[0];
        const id = f?.properties?.id as string | undefined;
        if (!id) return;

        onSelectRef.current(id);

        const s = stateRef.current.get(id);
        if (!s) return;

        popupRef.current?.remove();

        const age = Date.now() - s.lastUpdateMs;
        const live = age < 15_000 && s.isOnline;
        const statusColor = live ? "#10b981" : "#ef4444";
        const statusText  = live ? "متصل" : "غير متصل";
        const timeAgo = age < 60_000
          ? `منذ ${Math.round(age / 1000)} ث`
          : `منذ ${Math.round(age / 60_000)} د`;

        const html = `
          <div dir="rtl" style="font-family:system-ui,sans-serif;min-width:180px;padding:4px 2px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <strong style="font-size:15px;color:#0f172a">باص ${s.busNumber}</strong>
              <span style="background:${statusColor}20;color:${statusColor};font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid ${statusColor}40">${statusText}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:#475569">
              <div>📍 المنطقة: <strong style="color:#0f172a">${s.district}</strong></div>
              <div>🚦 السرعة: <strong style="color:#0f172a">${s.speed != null ? s.speed.toFixed(0) + " كم/س" : "—"}</strong></div>
              <div>⏱ آخر تحديث: <strong style="color:#0f172a">${timeAgo}</strong></div>
            </div>
          </div>`;

        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: "240px",
          offset: [0, -10],
        })
          .setLngLat(s.current)
          .setHTML(html)
          .addTo(map);
      });

      // أغلق popup عند الضغط على الخريطة بعيداً عن الباصات
      map.on("click", (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ["bus-icons"] });
        if (hits.length === 0) popupRef.current?.remove();
      });
      map.on("mouseenter", "bus-icons", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "bus-icons", () => {
        map.getCanvas().style.cursor = "";
      });

      readyRef.current = true;

      // ── حلقة RAF: lerp + pulse + setData ────────────────────────────────
      const loop = () => {
        if (!map.getSource("buses")) return;

        const now = Date.now();

        // حرّك pulse ring (circle-radius يتأرجح بين 14 و 24)
        pulseRef.current += 0.045;
        const pulsedR = 14 + 10 * (0.5 + 0.5 * Math.sin(pulseRef.current));
        (map.getSource("buses") as maplibregl.GeoJSONSource); // تحقق أن الـ source موجود
        try {
          map.setPaintProperty("bus-pulse", "circle-radius", pulsedR);
          map.setPaintProperty("bus-pulse", "circle-stroke-opacity",
            0.3 + 0.45 * (0.5 + 0.5 * Math.sin(pulseRef.current))
          );
        } catch { /* الخريطة غير جاهزة */ }

        // خصائص الباصات — Hermite interpolation + Dead Reckoning
        const features: Feature[] = [];
        stateRef.current.forEach((s, id) => {
          const timeSinceUpdate = now - s.lastUpdateMs;
          const live = timeSinceUpdate < 15_000 && s.isOnline;

          if (live && timeSinceUpdate < DEAD_RECKONING_MAX_MS) {
            // ── Hermite interpolation مع Dead Reckoning ──
            const elapsed = now - s.arrivalMs;
            const t = Math.min(1, elapsed / EXPECTED_UPDATE_INTERVAL_MS);
            const h = hermiteInterp(t);

            // حرّك نحو الهدف بـ Hermite (سلس)
            const interpLng = s.current[0] + (s.target[0] - s.current[0]) * h;
            const interpLat = s.current[1] + (s.target[1] - s.current[1]) * h;

            if (t >= 0.98) {
              // وصلنا للهدف — Dead Reckoning لتقدير موقع جديد
              const drDt = now - s.lastFrameMs;
              if (drDt > 0 && drDt < 200 && s.speed && s.speed > 2) {
                const dr = deadReckon([interpLng, interpLat], s.bearing, s.speed, drDt);
                s.current = dr;
              } else {
                s.current = [interpLng, interpLat];
              }
            } else {
              s.current = [interpLng, interpLat];
            }

            // تنعيم الاتجاه
            s.bearing = lerpAngle(s.bearing, s.targetBearing, 0.08);
          }

          s.lastFrameMs = now;

          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: s.current },
            properties: {
              id,
              busNumber: s.busNumber,
              bearing: s.bearing,
              live,
              selected: selectedRef.current === id,
            },
          });
        });

        try {
          (map.getSource("buses") as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features,
          });
        } catch { /* صامت */ }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    });

    return () => {
      readyRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      popupRef.current?.remove();
      stateRef.current.clear();
      savedZoom = map.getZoom();
      const c = map.getCenter();
      savedCenter = [c.lng, c.lat];
      firstFitDone = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── تحديث stateRef عند وصول locations ──────────────────────────────────
  useEffect(() => {
    const st = stateRef.current;
    const valid = locations.filter((l) => l.hasLocation);
    const seen = new Set(valid.map((l) => l.busId));

    // احذف الباصات التي اختفت
    Array.from(st.keys()).forEach((id) => { if (!seen.has(id)) st.delete(id); });

    valid.forEach((bus) => {
      const id = bus.busId;
      const target: [number, number] = [bus.longitude, bus.latitude];
      const lastMs = new Date(bus.lastUpdate).getTime() || Date.now();

      if (!st.has(id)) {
        st.set(id, {
          current: target,
          target,
          prev: target,
          bearing: bus.heading ?? 0,
          targetBearing: bus.heading ?? 0,
          isOnline: bus.isOnline,
          lastUpdateMs: lastMs,
          lastFrameMs: Date.now(),
          busNumber: bus.busNumber,
          district: bus.district,
          speed: bus.speed,
          arrivalMs: Date.now(),
        });
      } else {
        const s = st.get(id)!;
        const prevTarget = s.target;
        const dist = Math.abs(target[0] - prevTarget[0]) + Math.abs(target[1] - prevTarget[1]);

        if (dist > 1e-6) {
          // هدف جديد — حرّك current لموقع الـ Hermite الحالي وابدأ interpolation جديد
          s.prev = s.current.slice() as [number, number];
          s.current = s.current.slice() as [number, number]; // تثبيت الموقع الحالي
          s.target = target;
          s.arrivalMs = Date.now();

          try { s.targetBearing = turf.bearing(turf.point(prevTarget), turf.point(target)); }
          catch { /* صامت */ }
        }

        s.isOnline = bus.isOnline;
        s.lastUpdateMs = lastMs;
        s.busNumber = bus.busNumber;
        s.district = bus.district;
        s.speed = bus.speed;

        // حدّث الـ popup المفتوح إذا كان هذا هو الباص المختار
        if (popupRef.current?.isOpen() && selectedRef.current === id) {
          const age = Date.now() - s.lastUpdateMs;
          const live = age < 15_000 && s.isOnline;
          const sc = live ? "#10b981" : "#ef4444";
          const st2 = live ? "متصل" : "غير متصل";
          const ta = age < 60_000 ? `منذ ${Math.round(age / 1000)} ث` : `منذ ${Math.round(age / 60_000)} د`;
          popupRef.current.setLngLat(s.current);
          popupRef.current.setHTML(`
            <div dir="rtl" style="font-family:system-ui,sans-serif;min-width:180px;padding:4px 2px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <strong style="font-size:15px;color:#0f172a">باص ${s.busNumber}</strong>
                <span style="background:${sc}20;color:${sc};font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid ${sc}40">${st2}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;font-size:12px;color:#475569">
                <div>📍 المنطقة: <strong style="color:#0f172a">${s.district}</strong></div>
                <div>🚦 السرعة: <strong style="color:#0f172a">${s.speed != null ? s.speed.toFixed(0) + " كم/س" : "—"}</strong></div>
                <div>⏱ آخر تحديث: <strong style="color:#0f172a">${ta}</strong></div>
              </div>
            </div>`);
        }
      }
    });
  }, [locations]);

  // ── Auto-fit عند أول بيانات حقيقية ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstFitDone) return;

    const valid = locations.filter(
      (l) => l.hasLocation && Math.abs(l.latitude) > 0.01
    );
    if (valid.length === 0) return;

    firstFitDone = true;

    if (valid.length === 1) {
      map.easeTo({ center: [valid[0].longitude, valid[0].latitude], zoom: 15, duration: 800 });
    } else {
      const bounds = valid.reduce(
        (b, l) => b.extend([l.longitude, l.latitude] as [number, number]),
        new maplibregl.LngLatBounds(
          [valid[0].longitude, valid[0].latitude],
          [valid[0].longitude, valid[0].latitude]
        )
      );
      map.fitBounds(bounds, { padding: 100, maxZoom: 14, duration: 800 });
    }
  }, [locations]);

  // ── Pan عند اختيار باص ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBus) return;
    const s = stateRef.current.get(selectedBus);
    if (!s) return;
    map.easeTo({
      center: s.current,
      duration: 500,
      easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    });
  }, [selectedBus]);

  return (
    <div
      ref={mapDivRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: "500px" }}
    />
  );
}
