"use client";

/**
 * map-tracker-v2.tsx
 * ==================
 * خريطة تتبع الباصات — نسخة نظيفة مبنية من الصفر
 *
 * الميزات:
 * - أيقونة SVG منظر علوي (top-down) تدور بـ CSS transition سلس
 * - تحديث الدوران مباشرة على DOM (بدون setIcon) → transition يشتغل فعلاً
 * - الزوم والمركز محفوظان على مستوى الـ module → لا يُفقدان عند re-mount
 * - لا fitBounds / لا flyTo تلقائي → المستخدم يتحكم بالزوم بالكامل
 * - عند اختيار باص: panTo فقط (تحريك المركز بدون تغيير الزوم)
 * - تحريك sمسار (animation) سلس بـ requestAnimationFrame
 * - OSRM road-snap لتحسين اتجاه الباص على الطرق الحقيقية
 * - route history عند اختيار باص (مرة واحدة فقط، مع AbortController)
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
// Module-level state (يبقى بين re-mounts)
// ─────────────────────────────────────────────────────────────────────────────

let savedZoom = 13;
let savedCenter: L.LatLngTuple = [21.4858, 39.1925]; // جدة

let cssInjected = false;

// ─────────────────────────────────────────────────────────────────────────────
// CSS (مرة واحدة فقط)
// ─────────────────────────────────────────────────────────────────────────────

function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = `
    .bm-icon { background: none !important; border: none !important; }
    .bm-wrap { transition: transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94); }
    @keyframes bmPulse {
      0%,100% { opacity:.45; transform:scale(.85); }
      50%      { opacity:.8;  transform:scale(1.1); }
    }
  `;
  document.head.appendChild(s);
  cssInjected = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG أيقونة باص (منظر من أعلى، 40×40 viewBox)
// ─────────────────────────────────────────────────────────────────────────────

function busSVG(color: string, alpha: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" style="display:block;opacity:${alpha};">
  <!-- ظل -->
  <ellipse cx="20" cy="37" rx="9" ry="2.5" fill="rgba(0,0,0,0.18)"/>
  <!-- جسم الباص -->
  <rect x="9" y="5" width="22" height="30" rx="6" fill="${color}" stroke="#111" stroke-width="1.3"/>
  <!-- سقف داكن قليلاً -->
  <rect x="10" y="6" width="20" height="28" rx="5.5" fill="${color}" opacity="0.85"/>
  <!-- زجاج أمامي -->
  <rect x="12" y="7.5" width="16" height="7" rx="3" fill="#B3E5FC" stroke="#0288D1" stroke-width="0.7" opacity="0.95"/>
  <!-- زجاج خلفي -->
  <rect x="13" y="27.5" width="14" height="4.5" rx="2.5" fill="#B3E5FC" stroke="#0288D1" stroke-width="0.6" opacity="0.8"/>
  <!-- نوافذ وسط يسار -->
  <rect x="9.5" y="17" width="3" height="4" rx="1" fill="#E1F5FE" stroke="#0288D1" stroke-width="0.5"/>
  <rect x="9.5" y="22.5" width="3" height="4" rx="1" fill="#E1F5FE" stroke="#0288D1" stroke-width="0.5"/>
  <!-- نوافذ وسط يمين -->
  <rect x="27.5" y="17" width="3" height="4" rx="1" fill="#E1F5FE" stroke="#0288D1" stroke-width="0.5"/>
  <rect x="27.5" y="22.5" width="3" height="4" rx="1" fill="#E1F5FE" stroke="#0288D1" stroke-width="0.5"/>
  <!-- مصابيح أمامية -->
  <rect x="12" y="8" width="4.5" height="2.5" rx="1.2" fill="#FFEE58" stroke="#F9A825" stroke-width="0.4"/>
  <rect x="23.5" y="8" width="4.5" height="2.5" rx="1.2" fill="#FFEE58" stroke="#F9A825" stroke-width="0.4"/>
  <!-- مصابيح خلفية -->
  <rect x="12" y="31" width="4" height="2" rx="1" fill="#EF5350" stroke="#C62828" stroke-width="0.3"/>
  <rect x="24" y="31" width="4" height="2" rx="1" fill="#EF5350" stroke="#C62828" stroke-width="0.3"/>
  <!-- عجلات -->
  <rect x="6"  y="10" width="4" height="6" rx="1.5" fill="#222" stroke="#000" stroke-width="0.5"/>
  <rect x="30" y="10" width="4" height="6" rx="1.5" fill="#222" stroke="#000" stroke-width="0.5"/>
  <rect x="6"  y="25" width="4" height="6" rx="1.5" fill="#222" stroke="#000" stroke-width="0.5"/>
  <rect x="30" y="25" width="4" height="6" rx="1.5" fill="#222" stroke="#000" stroke-width="0.5"/>
  <!-- خط وسط الجسم -->
  <line x1="20" y1="15" x2="20" y2="26" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>
  <!-- سهم الاتجاه (أعلى = أمام) -->
  <polygon points="20,2 17,6.5 23,6.5" fill="white" opacity="0.9" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// createIcon — يُنشئ L.divIcon كاملاً
// ─────────────────────────────────────────────────────────────────────────────

function createIcon(loc: BusLocation, isSelected: boolean, heading: number): L.DivIcon {
  injectCSS();

  const sz = isSelected ? 36 : 28;
  const color = loc.isOnline ? "#F9A825" : "#9E9E9E";
  const alpha = loc.isOnline ? "1" : "0.5";
  const ring = isSelected
    ? `<div style="position:absolute;inset:-4px;border:2.5px solid #1A73E8;border-radius:50%;opacity:.55;pointer-events:none;"></div>`
    : "";
  const label = loc.busNumber
    ? `<div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.95);color:#222;font:700 7px/12px system-ui;padding:1px 4px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.15);border:.5px solid #ddd;">${loc.busNumber}</div>`
    : "";
  const glow = loc.isOnline
    ? `<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:18px;height:6px;border-radius:999px;background:radial-gradient(ellipse,rgba(249,168,37,.55) 0%,transparent 70%);filter:blur(1px);animation:bmPulse 1.6s ease-in-out infinite;pointer-events:none;"></div>`
    : "";

  const wrap = sz + 10;
  const totalH = wrap + (loc.busNumber ? 16 : 0);

  return L.divIcon({
    className: "bm-icon",
    html: `
      <div style="position:relative;width:${wrap}px;height:${totalH}px;overflow:visible;">
        <div class="bm-wrap" style="position:absolute;top:0;left:${(wrap - sz) / 2}px;width:${sz}px;height:${sz}px;transform:rotate(${Math.round(heading)}deg);">
          ${busSVG(color, alpha)}
        </div>
        ${ring}
        ${glow}
        ${label}
      </div>`,
    iconSize: [wrap, totalH],
    iconAnchor: [wrap / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 4)],
  });
}

// تحديث الدوران مباشرة على DOM (CSS transition يشتغل)
function setRotation(marker: L.Marker, deg: number) {
  const el = marker.getElement();
  if (!el) return;
  const wrap = el.querySelector<HTMLElement>(".bm-wrap");
  if (wrap) wrap.style.transform = `rotate(${Math.round(deg)}deg)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────

function bearing(la1: number, lo1: number, la2: number, lo2: number): number {
  const r = Math.PI / 180;
  const dL = (lo2 - lo1) * r;
  const y = Math.sin(dL) * Math.cos(la2 * r);
  const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos(dL);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

function distM(la1: number, lo1: number, la2: number, lo2: number): number {
  const r = Math.PI / 180, R = 6371000;
  const dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function norm(d: number): number { return ((d % 360) + 360) % 360; }

function shortDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function blend(base: number, target: number, w = 0.7): number {
  return norm(base + shortDelta(base, target) * w);
}

// ─────────────────────────────────────────────────────────────────────────────
// Smooth marker animation
// ─────────────────────────────────────────────────────────────────────────────

function animateTo(marker: L.Marker, lat: number, lng: number, ms = 1400) {
  const s = marker.getLatLng();
  if (Math.abs(s.lat - lat) < 1e-5 && Math.abs(s.lng - lng) < 1e-5) return;
  const t0 = performance.now();
  const dLa = lat - s.lat, dLo = lng - s.lng;
  function step(now: number) {
    const t = Math.min((now - t0) / ms, 1);
    const e = 1 - (1 - t) ** 3; // ease-out cubic
    marker.setLatLng([s.lat + dLa * e, s.lng + dLo * e]);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────────────────────────────
// Route drawing helpers
// ─────────────────────────────────────────────────────────────────────────────

function drawGPSPath(map: L.Map, pts: L.LatLngTuple[]): L.Layer[] {
  const layers: L.Layer[] = [];
  layers.push(L.polyline(pts, { color: "#0f9d58", weight: 4, opacity: .7, smoothFactor: 1.5 }).addTo(map));
  layers.push(L.circleMarker(pts[0], { radius: 6, fillColor: "#4CAF50", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map).bindTooltip("بداية المسار", { direction: "top" }));
  layers.push(L.circleMarker(pts[pts.length - 1], { radius: 6, fillColor: "#EA4335", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map).bindTooltip("الموقع الحالي", { direction: "top" }));
  return layers;
}

function drawRoadPath(map: L.Map, coords: [number, number][]): L.Layer[] {
  const pts: L.LatLngTuple[] = coords.map(([lo, la]) => [la, lo]);
  const layers: L.Layer[] = [];
  layers.push(L.polyline(pts, { color: "#000", weight: 7, opacity: .04 }).addTo(map));
  layers.push(L.polyline(pts, { color: "#0f9d58", weight: 4, opacity: .75, smoothFactor: 1, lineCap: "round" }).addTo(map));
  layers.push(L.polyline(pts, { color: "#34A853", weight: 2, opacity: .7, dashArray: "5,12" }).addTo(map));
  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Popup content builder
// ─────────────────────────────────────────────────────────────────────────────

function buildPopup(loc: BusLocation, heading: number | null): string {
  const diff = Math.floor((Date.now() - new Date(loc.lastUpdate).getTime()) / 1000);
  const ago = diff < 60 ? `${diff}ث` : diff < 3600 ? `${Math.floor(diff / 60)}د` : `${Math.floor(diff / 3600)}س`;
  const statusLabel = loc.isOnline
    ? (loc.isCellTower ? "🟠 برج خلوي" : "🟢 متصل الآن")
    : loc.hasLocation === false ? "⏳ بانتظار التتبع" : "🔴 غير متصل";
  const statusBg = loc.isOnline ? (loc.isCellTower ? "#FF9800" : "#0f9d58") : loc.hasLocation === false ? "#FF9800" : "#ea4335";
  const acc = loc.accuracy != null ? `${loc.accuracy.toFixed(0)} م` : "—";

  return `<div dir="rtl" style="text-align:right;min-width:210px;font-family:system-ui,sans-serif;padding:4px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
      <div style="width:40px;height:40px;background:linear-gradient(135deg,#FFD600,#F9A825);border-radius:10px;display:flex;align-items:center;justify-content:center;">
        <div style="width:24px;height:24px;">${busSVG("#fff","1")}</div>
      </div>
      <div>
        <div style="font-size:16px;font-weight:800;color:#0f172a;">باص ${loc.busNumber}</div>
        <span style="font-size:11px;padding:2px 9px;border-radius:20px;color:#fff;background:${statusBg};font-weight:600;">${statusLabel}</span>
      </div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:8px;display:grid;gap:4px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;">
        <b>${loc.speed?.toFixed(0) ?? 0} كم/س</b><span>⚡ السرعة</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;">
        <b>${loc.district}</b><span>📍 الحي</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#475569;">
        <b>${heading != null ? `${heading.toFixed(0)}°` : "—"}</b><span>🧭 الاتجاه</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;">
        <span>منذ ${ago}</span><span>🕐 آخر تحديث</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;">
        <span>${acc}</span><span>🎯 دقة GPS</span>
      </div>
    </div>
    ${loc.isCellTower ? `<div style="margin-top:6px;padding:6px 8px;background:#fff3e0;border-radius:6px;border:1px solid #ffe0b2;font-size:11px;color:#e65100;">⚠️ الموقع تقريبي — قد يصل الخطأ للـ ${loc.accuracy?.toFixed(0) ?? "2000"} م</div>` : ""}
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MapTracker({ locations, selectedBus, onSelectBus }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const markersRef    = useRef<Map<string, L.Marker>>(new Map());
  const routeRef      = useRef<L.Layer[]>([]);

  // per-bus state
  const prevLatLng    = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const prevHeading   = useRef<Map<string, number>>(new Map());
  const prevStatus    = useRef<Map<string, string>>(new Map()); // "online_selected"
  const roadSnap      = useRef<Map<string, { h: number | null; at: number }>>(new Map());
  const snapInFlight  = useRef<Set<string>>(new Set());

  const firstRender   = useRef(true);
  const prevSelected  = useRef<string | null>(null);

  // نعرض جميع الباصات النشطة على الخريطة — حتى التي بدون GPS تظهر عند مركز جدة
  const mapLocations = locations;

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: savedCenter,
      zoom: savedZoom,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org">OSM</a>')
      .addTo(map);

    mapRef.current = map;

    // ⬇ احفظ الزوم والمركز عند كل تغيير — لا يُفقد عند re-mount
    const save = () => {
      savedZoom = map.getZoom();
      const c = map.getCenter();
      savedCenter = [c.lat, c.lng];
    };
    map.on("zoomend moveend", save);

    return () => {
      map.off("zoomend moveend", save);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Markers update ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set(mapLocations.map((l) => l.busId));

    // حذف باصات انتهت
    markersRef.current.forEach((mk, id) => {
      if (!activeIds.has(id)) {
        mk.remove();
        markersRef.current.delete(id);
        prevLatLng.current.delete(id);
        prevHeading.current.delete(id);
        prevStatus.current.delete(id);
        roadSnap.current.delete(id);
      }
    });

    mapLocations.forEach((loc) => {
      const existing  = markersRef.current.get(loc.busId);
      const prev      = prevLatLng.current.get(loc.busId);
      const spd       = typeof loc.speed    === "number" && isFinite(loc.speed)    ? loc.speed    : null;
      const acc       = typeof loc.accuracy === "number" && isFinite(loc.accuracy) ? loc.accuracy : null;
      const now       = Date.now();

      // ── OSRM road-snap (عند التحرك بسرعة كافية) ──────────────────────────
      if (loc.isOnline && prev && !snapInFlight.current.has(loc.busId)) {
        const moved = distM(prev.lat, prev.lng, loc.latitude, loc.longitude);
        if (moved >= 25 && (spd ?? 0) >= 12 && (acc == null || acc > 35)) {
          snapInFlight.current.add(loc.busId);
          const coords = `${prev.lng},${prev.lat};${loc.longitude},${loc.latitude}`;
          fetch(`https://router.project-osrm.org/match/v1/driving/${coords}?geometries=geojson&overview=full&steps=false&radiuses=30;30`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              let roadH: number | null = null;
              const geom = data?.matchings?.[0]?.geometry?.coordinates as [number,number][] | undefined;
              if (geom && geom.length >= 2) {
                const p1 = geom[geom.length - 2], p2 = geom[geom.length - 1];
                roadH = bearing(p1[1], p1[0], p2[1], p2[0]);
              }
              roadSnap.current.set(loc.busId, { h: roadH, at: Date.now() });

              const mk = markersRef.current.get(loc.busId);
              if (!mk || roadH == null) return;
              const stable = prevHeading.current.get(loc.busId);
              let rh = stable != null ? norm(stable + Math.min(Math.max(shortDelta(stable, roadH), -110), 110)) : roadH;
              prevHeading.current.set(loc.busId, rh);
              setRotation(mk, rh);
            })
            .catch(() => {})
            .finally(() => snapInFlight.current.delete(loc.busId));
        }
      }

      // ── حساب heading ──────────────────────────────────────────────────────
      const snap     = roadSnap.current.get(loc.busId);
      const freshH   = snap && now - snap.at <= 8000 ? snap.h : null;
      const sensorH  = typeof loc.heading === "number" && isFinite(loc.heading) ? norm(loc.heading) : null;
      const lastH    = prevHeading.current.get(loc.busId);

      let moveH: number | null = null;
      let moved = 0;
      if (prev) {
        moved = distM(prev.lat, prev.lng, loc.latitude, loc.longitude);
        if (moved >= 8) moveH = bearing(prev.lat, prev.lng, loc.latitude, loc.longitude);
      }

      let h: number | null = null;
      if (!loc.isOnline) {
        h = lastH ?? null;
      } else if (!prev && sensorH != null) {
        h = sensorH;                                          // أول ظهور
      } else if (moveH != null && freshH != null) {
        h = blend(moveH, freshH, 0.75);                       // حركة + طريق
      } else if (moveH != null) {
        h = moveH;                                            // حركة فقط
      } else if (freshH != null && sensorH != null && (spd ?? 0) > 5) {
        h = blend(sensorH, freshH, 0.8);
      } else if (sensorH != null && (spd == null || spd > 2)) {
        h = sensorH;
      } else {
        h = lastH ?? null;
      }

      // منع القفزات الحادة (حد أقصى 90° لكل تحديث)
      if (h != null && lastH != null) {
        const d = shortDelta(lastH, h);
        const maxStep = Math.abs(d) >= 120 && moved >= 15 ? 180 : 90;
        if (Math.abs(d) > maxStep) h = norm(lastH + Math.sign(d) * maxStep);
      }

      if (h != null) prevHeading.current.set(loc.busId, h);
      const finalH = h ?? lastH ?? 0;

      // ── تحديد أيقونة ─────────────────────────────────────────────────────
      const statusKey = `${loc.isOnline ? 1 : 0}_${loc.busId === selectedBus ? 1 : 0}`;
      const statusChanged = prevStatus.current.get(loc.busId) !== statusKey;
      prevStatus.current.set(loc.busId, statusKey);

      const popup = buildPopup(loc, h);

      if (existing) {
        // تحريك الموقع
        firstRender.current
          ? existing.setLatLng([loc.latitude, loc.longitude])
          : animateTo(existing, loc.latitude, loc.longitude, 1400);

        // أيقونة: فقط عند تغيير الحالة
        if (statusChanged) {
          existing.setIcon(createIcon(loc, loc.busId === selectedBus, finalH));
        } else {
          setRotation(existing, finalH);
        }

        existing.getPopup()?.setContent(popup);
      } else {
        const mk = L.marker([loc.latitude, loc.longitude], {
          icon: createIcon(loc, loc.busId === selectedBus, finalH),
        })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 270, className: "bus-popup" });

        mk.on("click", () => onSelectBus(loc.busId));
        markersRef.current.set(loc.busId, mk);
      }

      prevLatLng.current.set(loc.busId, { lat: loc.latitude, lng: loc.longitude });
    });

    firstRender.current = false;

    // ── panTo عند اختيار باص (بدون تغيير الزوم) ──────────────────────────
    const justSelected = selectedBus && selectedBus !== prevSelected.current;
    prevSelected.current = selectedBus;

    if (justSelected) {
      const t = locations.find((l) => l.busId === selectedBus);
      if (t) {
        map.panTo([t.latitude, t.longitude], { animate: true, duration: 0.7 });
        markersRef.current.get(selectedBus)?.openPopup();
      }
    }
  }, [locations, selectedBus, onSelectBus]);

  // ── Route history (عند اختيار باص) ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBus) return;

    const bus = locations.find((l) => l.busId === selectedBus);
    if (!bus?.isOnline) return;

    const ctrl = new AbortController();

    fetch(`/Performance/api/tracking?busId=${selectedBus}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then(async (hist: { latitude: number; longitude: number; timestamp: string }[]) => {
        if (hist.length < 2) return;
        const sorted = [...hist].reverse();
        const gpts: L.LatLngTuple[] = sorted.map((p) => [p.latitude, p.longitude]);
        const coords  = sorted.map((p) => `${p.longitude},${p.latitude}`).join(";");
        const ts      = sorted.map((p) => Math.floor(new Date(p.timestamp).getTime() / 1000)).join(";");
        const radii   = sorted.map(() => "25").join(";");

        try {
          const r = await fetch(
            `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&timestamps=${ts}&radiuses=${radii}`,
            { signal: ctrl.signal }
          );
          const data = await r.json();
          if (data?.matchings?.length) {
            for (const m of data.matchings) {
              const layers = drawRoadPath(map, m.geometry.coordinates);
              layers.forEach((l) => routeRef.current.push(l));
            }
            // نقطتا بداية/نهاية
            const ep = [
              L.circleMarker(gpts[0],            { radius:6, fillColor:"#4CAF50", color:"#fff", weight:2, fillOpacity:1 }).addTo(map).bindTooltip("بداية المسار", { direction:"top" }),
              L.circleMarker(gpts[gpts.length-1], { radius:6, fillColor:"#EA4335", color:"#fff", weight:2, fillOpacity:1 }).addTo(map).bindTooltip("الموقع الحالي",  { direction:"top" }),
            ];
            ep.forEach((p) => routeRef.current.push(p));
          } else {
            drawGPSPath(map, gpts).forEach((l) => routeRef.current.push(l));
          }
        } catch {
          if (!ctrl.signal.aborted) drawGPSPath(map, gpts).forEach((l) => routeRef.current.push(l));
        }
      })
      .catch(() => {});

    return () => {
      ctrl.abort();
      routeRef.current.forEach((l) => l.remove());
      routeRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBus]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="w-full h-[500px] md:h-[600px] rounded-xl z-0"
        style={{ direction: "ltr" }}
      />
      {locations.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.82)", backdropFilter: "blur(4px)",
          borderRadius: "0.75rem", zIndex: 1000, gap: 12, pointerEvents: "none",
        }}>
          <div style={{ fontSize: 40 }}>📡</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#334155", margin: 0 }}>
            لا توجد باصات مسجلة
          </p>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            أضف باصات من صفحة الإدارة
          </p>
        </div>
      )}
    </div>
  );
}

export const JEDDAH_CENTER = { lat: 21.4858, lng: 39.1925 };
