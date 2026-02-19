"use client";

/**
 * map-tracker-v3.tsx — MapLibre GL JS
 * ====================================
 * خريطة تتبع الباصات — أوبر ستايل
 *
 * الميزات:
 * - MapLibre GL (مفتوح المصدر، بدون API Key) + OpenFreeMap tiles مجاناً
 * - أيقونة SVG Top-View تدور بـ CSS transition سلس حسب bearing
 * - Interpolation في requestAnimationFrame (حركة سلسة بين نقطتين)
 * - Bearing تلقائي من آخر موضعين (بدون API خارجي — @turf/turf)
 * - وميض Glow أخضر/أحمر تحت الباص حسب حالة الاتصال
 * - نفس Props الـ map-tracker-v2 (drop-in replacement)
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";

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

// ─────────────────────────────────────────────────────────────────────────────
// حالة مستمرة بين re-mounts
// ─────────────────────────────────────────────────────────────────────────────

let savedZoom = 13;
let savedCenter: [number, number] = [39.1925, 21.4858]; // جدة [lng, lat]
let firstFitDone = false; // هل تم auto-fit مرة واحدة؟

// ─────────────────────────────────────────────────────────────────────────────
// حالة per-bus لمنع إعادة إنشاء الماركرات في كل render
// ─────────────────────────────────────────────────────────────────────────────

interface BusState {
  /** ماركر الأيقونة */
  marker: maplibregl.Marker;
  /** ماركر الوميض تحت الأيقونة */
  pulseMarker: maplibregl.Marker;
  /** عنصر الوميض DOM */
  pulseEl: HTMLDivElement;
  /** عنصر الأيقونة DOM */
  iconEl: HTMLDivElement;
  /** الموضع الحالي (مُحرَّك) */
  currentLng: number;
  currentLat: number;
  /** الهدف القادم من API */
  targetLng: number;
  targetLat: number;
  /** آخر موضع معروف (لحساب bearing) */
  prevLng: number | null;
  prevLat: number | null;
  /** bearing الحالي (درجة) */
  bearing: number;
  /** معرّف requestAnimationFrame للتنظيف */
  animFrame: number | null;
  /** هل الباص متصل */
  isOnline: boolean;
  /** آخر تحديث (ms) لرصد الاتصال */
  lastUpdateMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// مساعدات
// ─────────────────────────────────────────────────────────────────────────────

/** معدّل الحركة في requestAnimationFrame (0..1) */
const LERP_SPEED = 0.08;

/** تحريك سلس بين قيمتين (linear interpolation) */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** حساب bearing بين نقطتين [lng, lat] */
const calcBearing = (
  from: [number, number],
  to: [number, number]
): number => {
  try {
    return turf.bearing(turf.point(from), turf.point(to));
  } catch {
    return 0;
  }
};

/** تحليل lastUpdate إلى timestamp (ms) */
const parseMs = (dateStr: string): number => {
  try {
    return new Date(dateStr).getTime();
  } catch {
    return 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MapTrackerV3({ locations, selectedBus, onSelectBus }: Props) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const busesRef = useRef<Map<string, BusState>>(new Map());
  const loopRef = useRef<number | null>(null);

  // ── تهيئة الخريطة (مرة واحدة) ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      // positron: خريطة بيضاء/رمادية نظيفة بدون ألوان مزعجة
      style: "https://tiles.openfreemap.org/styles/positron",
      center: savedCenter,
      zoom: savedZoom,
      attributionControl: false,
      maxZoom: 20,
      minZoom: 5,
    });

    // أسماء الشوارع بالعربية
    map.on("load", () => {
      try {
        map.getStyle().layers.forEach((layer) => {
          if (layer.type === "symbol") {
            map.setLayoutProperty(layer.id, "text-field", [
              "coalesce",
              ["get", "name:ar"],
              ["get", "name"],
            ]);
          }
        });
      } catch { /* صامت */ }
    });

    // حفظ الزوم والمركز عند التحريك
    map.on("moveend", () => {
      savedZoom = map.getZoom();
      const c = map.getCenter();
      savedCenter = [c.lng, c.lat];
    });

    // أضف attribution صغير
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    // أضف أدوات التنقل
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right"
    );

    mapRef.current = map;

    // ── حلقة الحركة العامة ──────────────────────────────────────────────────
    const animationLoop = () => {
      const buses = busesRef.current;
      buses.forEach((state) => {
        const distLng = Math.abs(state.targetLng - state.currentLng);
        const distLat = Math.abs(state.targetLat - state.currentLat);
        const threshold = 1e-7;

        if (distLng > threshold || distLat > threshold) {
          state.currentLng = lerp(state.currentLng, state.targetLng, LERP_SPEED);
          state.currentLat = lerp(state.currentLat, state.targetLat, LERP_SPEED);

          const pos: [number, number] = [state.currentLng, state.currentLat];
          state.marker.setLngLat(pos);
          state.pulseMarker.setLngLat(pos);
        }

        // دوران الأيقونة بـ CSS (سلاسة من globals.css transition)
        state.iconEl.style.transform = `rotate(${state.bearing}deg)`;

        // وميض: أخضر إذا تحديث < 15 ثانية، أحمر غير ذلك
        const age = Date.now() - state.lastUpdateMs;
        const isLive = age < 15_000 && state.isOnline;
        if (isLive) {
          state.pulseEl.classList.remove("offline");
        } else {
          state.pulseEl.classList.add("offline");
        }
      });

      loopRef.current = requestAnimationFrame(animationLoop);
    };

    loopRef.current = requestAnimationFrame(animationLoop);

    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      // أزل كل الماركرات
      busesRef.current.forEach((s) => {
        s.marker.remove();
        s.pulseMarker.remove();
      });
      busesRef.current.clear();
      savedZoom = map.getZoom();
      const c = map.getCenter();
      savedCenter = [c.lng, c.lat];
      firstFitDone = false; // أعد التهيئة عند unmount
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Auto-fit عند أول تحميل للباصات ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstFitDone) return;
    // فقط الباصات التي لها موقع GPS حقيقي
    const valid = locations.filter(
      (l) => l.hasLocation === true &&
        l.latitude && l.longitude &&
        Math.abs(l.latitude) > 0.01 && Math.abs(l.longitude) > 0.01
    );
    if (valid.length === 0) return;

    firstFitDone = true;

    if (valid.length === 1) {
      map.easeTo({ center: [valid[0].longitude, valid[0].latitude], zoom: 14, duration: 800 });
    } else {
      const bounds = valid.reduce(
        (b, l) => b.extend([l.longitude, l.latitude] as [number, number]),
        new maplibregl.LngLatBounds(
          [valid[0].longitude, valid[0].latitude],
          [valid[0].longitude, valid[0].latitude]
        )
      );
      map.fitBounds(bounds, { padding: 120, maxZoom: 14, duration: 800 });
    }
  }, [locations]);

  // ── تحديث الماركرات عند تغيّر locations ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const buses = busesRef.current;
    const newIds = new Set(locations.map((l) => l.busId));

    // ── أزل الماركرات التي لم تعد موجودة ───────────────────────────────────
    buses.forEach((state, id) => {
      if (!newIds.has(id)) {
        state.marker.remove();
        state.pulseMarker.remove();
        buses.delete(id);
      }
    });

    // ── أضف أو حدّث ──────────────────────────────────────────────────────────
    locations.forEach((bus) => {
      // لا تعرض الباصات بدون موقع GPS حقيقي على الخريطة
      if (!bus.hasLocation) {
        // أزل الماركر إن كان موجوداً من قبل
        const old = buses.get(bus.busId);
        if (old) {
          old.marker.remove();
          old.pulseMarker.remove();
          buses.delete(bus.busId);
        }
        return;
      }
      const newLng = bus.longitude;
      const newLat = bus.latitude;
      const newMs = parseMs(bus.lastUpdate);

      if (!map) return;

      if (buses.has(bus.busId)) {
        // ── تحديث باص موجود ─────────────────────────────────────────────────
        const state = buses.get(bus.busId)!;
        const moved =
          Math.abs(newLng - state.targetLng) > 1e-6 ||
          Math.abs(newLat - state.targetLat) > 1e-6;

        if (moved) {
          // احفظ الموضع السابق لحساب bearing
          state.prevLng = state.targetLng;
          state.prevLat = state.targetLat;
          state.targetLng = newLng;
          state.targetLat = newLat;

          // احسب bearing الجديد
          if (state.prevLng !== null && state.prevLat !== null) {
            const b = calcBearing(
              [state.prevLng, state.prevLat],
              [newLng, newLat]
            );
            state.bearing = b;
          }
        }

        state.isOnline = bus.isOnline;
        state.lastUpdateMs = newMs || Date.now();

        // تحديث تسمية الباص
        const label = state.iconEl.querySelector<HTMLDivElement>(".bus-label");
        if (label) {
          label.textContent = bus.busNumber;
          label.className = `bus-label${selectedBus === bus.busId ? " selected-label" : ""}`;
        }

        // selected highlight
        if (selectedBus === bus.busId) {
          state.iconEl.classList.add("selected");
        } else {
          state.iconEl.classList.remove("selected");
        }
      } else {
        // ── أنشئ ماركر جديد ──────────────────────────────────────────────────
        const initPos: [number, number] = [newLng, newLat];

        // وميض (pulse)
        const pulseEl = document.createElement("div");
        pulseEl.className = `bus-pulse${bus.isOnline ? "" : " offline"}`;

        const pulseMarker = new maplibregl.Marker({
          element: pulseEl,
          anchor: "center",
        })
          .setLngLat(initPos)
          .addTo(map);

        // أيقونة الباص
        const iconWrap = document.createElement("div");
        iconWrap.className = `bus-icon-wrap${selectedBus === bus.busId ? " selected" : ""}`;

        // Label تحت الأيقونة
        const label = document.createElement("div");
        label.className = `bus-label${selectedBus === bus.busId ? " selected-label" : ""}`;
        label.textContent = bus.busNumber;
        Object.assign(label.style, {
          position: "absolute",
          bottom: "-18px",
          left: "50%",
          transform: "translateX(-50%)",
          background: selectedBus === bus.busId
            ? "#1A73E8"
            : "rgba(255,255,255,0.95)",
          color: selectedBus === bus.busId ? "#fff" : "#0f172a",
          font: "700 9px/14px system-ui,sans-serif",
          padding: "1px 6px",
          borderRadius: "5px",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          pointerEvents: "none",
        });
        iconWrap.appendChild(label);
        iconWrap.style.position = "relative";

        iconWrap.addEventListener("click", () => onSelectBus(bus.busId));

        const busMarker = new maplibregl.Marker({
          element: iconWrap,
          anchor: "center",
        })
          .setLngLat(initPos)
          .addTo(map);

        buses.set(bus.busId, {
          marker: busMarker,
          pulseMarker,
          pulseEl,
          iconEl: iconWrap,
          currentLng: newLng,
          currentLat: newLat,
          targetLng: newLng,
          targetLat: newLat,
          prevLng: null,
          prevLat: null,
          bearing: bus.heading ?? 0,
          animFrame: null,
          isOnline: bus.isOnline,
          lastUpdateMs: newMs || Date.now(),
        });
      }
    });
  }, [locations, selectedBus, onSelectBus]);

  // ── Pan to selected bus ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBus) return;

    const state = busesRef.current.get(selectedBus);
    if (!state) return;

    map.easeTo({
      center: [state.currentLng, state.currentLat],
      duration: 600,
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
