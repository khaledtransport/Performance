"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface BusLocationData {
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

interface MapTrackerProps {
  locations: BusLocationData[];
  selectedBus: string | null;
  onSelectBus: (busId: string) => void;
}

// أيقونة باص — منظر علوي (top-down) SVG مُدمج + دوران CSS مستمر
// مثل أوبر وكريم: أيقونة واحدة تدور بـ transform: rotate(heading)

// حفظ الزوم والمركز بين re-mounts (مستوى الـ module، لا يُفقد بين re-renders)
let _savedZoom = 12;
let _savedCenter: [number, number] = [21.4858, 39.1925];

let busStyleInjected = false;
function ensureBusStyles() {
  if (busStyleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    .bus-marker-icon{background:none!important;border:none!important;}
    .bus-svg-wrap{transition:transform 0.6s ease;}
    @keyframes busGlow {
      0%, 100% { transform: scale(0.9); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.85; }
    }
  `;
  document.head.appendChild(style);
  busStyleInjected = true;
}

// SVG أيقونة باص منظر علوي — مقاس 36×36 viewBox
function busTopDownSVG(bodyColor: string, opacity: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" style="display:block;opacity:${opacity};filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35));">
    <!-- جسم الباص -->
    <rect x="8" y="4" width="20" height="28" rx="5" ry="5" fill="${bodyColor}" stroke="#1a1a1a" stroke-width="1.2"/>
    <!-- زجاج أمامي -->
    <rect x="11" y="6" width="14" height="6" rx="2.5" fill="#b3e5fc" stroke="#0288d1" stroke-width="0.6" opacity="0.9"/>
    <!-- زجاج خلفي -->
    <rect x="12" y="26" width="12" height="4" rx="2" fill="#b3e5fc" stroke="#0288d1" stroke-width="0.5" opacity="0.7"/>
    <!-- نوافذ جانبية يسار -->
    <rect x="8.5" y="14" width="2.5" height="3.5" rx="0.8" fill="#e1f5fe" stroke="#0288d1" stroke-width="0.4"/>
    <rect x="8.5" y="19" width="2.5" height="3.5" rx="0.8" fill="#e1f5fe" stroke="#0288d1" stroke-width="0.4"/>
    <!-- نوافذ جانبية يمين -->
    <rect x="25" y="14" width="2.5" height="3.5" rx="0.8" fill="#e1f5fe" stroke="#0288d1" stroke-width="0.4"/>
    <rect x="25" y="19" width="2.5" height="3.5" rx="0.8" fill="#e1f5fe" stroke="#0288d1" stroke-width="0.4"/>
    <!-- مصابيح أمامية -->
    <circle cx="11" cy="5.5" r="1.3" fill="#FFF9C4" stroke="#F9A825" stroke-width="0.5"/>
    <circle cx="25" cy="5.5" r="1.3" fill="#FFF9C4" stroke="#F9A825" stroke-width="0.5"/>
    <!-- مصابيح خلفية -->
    <circle cx="13" cy="31" r="1" fill="#ef5350" stroke="#c62828" stroke-width="0.4"/>
    <circle cx="23" cy="31" r="1" fill="#ef5350" stroke="#c62828" stroke-width="0.4"/>
    <!-- عجلات -->
    <rect x="5.5" y="9" width="3" height="5" rx="1.2" fill="#333" stroke="#111" stroke-width="0.5"/>
    <rect x="27.5" y="9" width="3" height="5" rx="1.2" fill="#333" stroke="#111" stroke-width="0.5"/>
    <rect x="5.5" y="22" width="3" height="5" rx="1.2" fill="#333" stroke="#111" stroke-width="0.5"/>
    <rect x="27.5" y="22" width="3" height="5" rx="1.2" fill="#333" stroke="#111" stroke-width="0.5"/>
    <!-- سهم اتجاه أمامي -->
    <polygon points="18,2 15.5,5.5 20.5,5.5" fill="white" opacity="0.85"/>
  </svg>`;
}

const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  ensureBusStyles();
  const rotation = heading != null && Number.isFinite(heading) ? Math.round(heading) : 0;

  const scale = isSelected ? 1.25 : 1;
  const s = Math.round(28 * scale); // حجم الأيقونة

  const bodyColor = isOnline ? '#F9A825' : '#9E9E9E';  // أصفر ذهبي متصل، رمادي غير متصل
  const opacity = isOnline ? '1' : '0.5';
  const accent = isSelected ? '#1A73E8' : isOnline ? '#4CAF50' : '#9E9E9E';
  const totalS = s + 8;
  const totalH = totalS + (busNumber ? 14 : 0);
  const glowColor = isOnline ? 'rgba(249,168,37,0.5)' : 'rgba(120,120,120,0.1)';

  return L.divIcon({
    className: "bus-marker-icon",
    html: `
      <div style="position:relative;width:${totalS}px;height:${totalH}px;overflow:visible;">
        ${isOnline ? `<div style="position:absolute;left:${totalS / 2 - 10}px;top:${s}px;width:20px;height:7px;border-radius:999px;background:radial-gradient(ellipse at center, ${glowColor} 0%, rgba(249,168,37,0.15) 55%, transparent 100%);filter:blur(1.5px);animation:busGlow 1.5s ease-in-out infinite;z-index:2;pointer-events:none;"></div>` : ''}
        <div class="bus-svg-wrap" style="position:absolute;top:0;left:${(totalS - s) / 2}px;width:${s}px;height:${s}px;cursor:pointer;z-index:10;transform:rotate(${rotation}deg);">
          ${busTopDownSVG(bodyColor, opacity)}
        </div>
        ${isSelected ? `<div style="position:absolute;top:-2px;left:${(totalS - s - 6) / 2}px;width:${s + 6}px;height:${s + 6}px;border:2.5px solid ${accent};border-radius:50%;opacity:0.5;pointer-events:none;"></div>` : ''}
        ${busNumber ? `<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.95);color:#333;font-size:7px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap;z-index:20;box-shadow:0 0.5px 2px rgba(0,0,0,0.12);border:0.5px solid #e0e0e0;line-height:12px;">${busNumber}</div>` : ''}
      </div>
    `,
    iconSize: [totalS, totalH],
    iconAnchor: [totalS / 2, s / 2],
    popupAnchor: [0, -(s / 2)],
  });
};

// رسم مسار GPS مباشر (خطوط مستقيمة) كبديل احتياطي
function drawDirectGPSPath(map: L.Map, points: [number, number][]) {
  const layers: L.Layer[] = [];
  
  const busRoute = L.polyline(points, {
    color: '#0f9d58',
    weight: 4,
    opacity: 0.7,
    smoothFactor: 1.5,
    lineCap: 'round',
  }).addTo(map);
  layers.push(busRoute);

  const startMarker = L.circleMarker(points[0], {
    radius: 7,
    fillColor: '#4CAF50',
    color: 'white',
    weight: 2.5,
    fillOpacity: 1,
  }).addTo(map).bindTooltip('بداية المسار', { direction: 'top' });
  layers.push(startMarker);

  const endMarker = L.circleMarker(points[points.length - 1], {
    radius: 7,
    fillColor: '#EA4335',
    color: 'white',
    weight: 2.5,
    fillOpacity: 1,
  }).addTo(map).bindTooltip('الموقع الحالي', { direction: 'top' });
  layers.push(endMarker);

  return layers;
}

// حساب الاتجاه بين نقطتين GPS (بالدرجات، 0°=شمال)
function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

function blendAngles(baseDeg: number, targetDeg: number, targetWeight = 0.7): number {
  const delta = shortestAngleDelta(baseDeg, targetDeg);
  return normalizeHeading(baseDeg + delta * targetWeight);
}

// تحريك العلامة بسلاسة من موقع لآخر (Smooth Marker Animation)
function animateMarker(marker: L.Marker, targetLat: number, targetLng: number, durationMs = 1500) {
  const start = marker.getLatLng();
  const startTime = performance.now();
  const dlat = targetLat - start.lat;
  const dlng = targetLng - start.lng;
  if (Math.abs(dlat) < 0.00001 && Math.abs(dlng) < 0.00001) return; // لا حاجة للتحريك

  function step(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    // ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    marker.setLatLng([start.lat + dlat * ease, start.lng + dlng * ease]);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export default function MapTracker({
  locations,
  selectedBus,
  onSelectBus,
}: MapTrackerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLocationsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const prevHeadingsRef = useRef<Map<string, number>>(new Map());
  const prevDirectionRef = useRef<Map<string, number>>(new Map());
  const prevStatusRef = useRef<Map<string, string>>(new Map()); // key: busId, value: "online|selected"
  const roadSnapRef = useRef<Map<string, { heading: number | null; updatedAt: number }>>(new Map());
  const roadSnapInFlightRef = useRef<Set<string>>(new Set());
  const isFirstRenderRef = useRef(true);
  const prevSelectedBusRef = useRef<string | null>(null);
  const userInteractedRef = useRef(false);

  // تحديث دوران الأيقونة مباشرة على DOM بدون إعادة خلق الأيقونة (لتشتغل CSS transition)
  const setMarkerRotation = (marker: L.Marker, heading: number) => {
    const el = marker.getElement();
    if (!el) return;
    const wrap = el.querySelector('.bus-svg-wrap') as HTMLElement | null;
    if (wrap) wrap.style.transform = `rotate(${Math.round(heading)}deg)`;
  };

  // تهيئة الخريطة
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: _savedCenter,
      zoom: _savedZoom,
      zoomControl: true,
      attributionControl: false,
    });

    // خريطة فاتحة نظيفة (CartoDB Positron) - أفضل لعرض الباصات
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control
      .attribution({ prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org">OpenStreetMap</a>')
      .addTo(map);

    mapRef.current = map;

    // احفظ الزوم والمركز الحالي عند أي تغيير من المستخدم
    const saveView = () => {
      _savedZoom = map.getZoom();
      const c = map.getCenter();
      _savedCenter = [c.lat, c.lng];
      userInteractedRef.current = true;
    };
    map.on('zoomend', saveView);
    map.on('moveend', saveView);

    return () => {
      map.off('zoomend', saveView);
      map.off('moveend', saveView);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // تحديث العلامات والمسارات على الخريطة
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(locations.map((l) => l.busId));

    // حذف العلامات غير الموجودة
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
        prevLocationsRef.current.delete(id);
        prevHeadingsRef.current.delete(id);
        prevDirectionRef.current.delete(id);
        prevStatusRef.current.delete(id);
        roadSnapRef.current.delete(id);
        roadSnapInFlightRef.current.delete(id);
      }
    });

    // تم تعطيل رسم مسار جميع الباصات عبر OSRM لتقليل التأخير وتحسين سلاسة التحديث الحي.

    // تحديث أو إضافة العلامات مع حساب الاتجاه من نقاط GPS المتتالية
    locations.forEach((loc) => {
      const existing = markersRef.current.get(loc.busId);
      const prev = prevLocationsRef.current.get(loc.busId);
      const now = Date.now();

      // محاولة مطابقة الموقع مع الطريق (Map Matching) لتحسين منطق الحركة مثل تطبيقات الأجرة
      const speedValue = typeof loc.speed === 'number' && Number.isFinite(loc.speed) ? loc.speed : null;
      const accuracyValue = typeof loc.accuracy === 'number' && Number.isFinite(loc.accuracy) ? loc.accuracy : null;
      if (loc.isOnline && prev && !roadSnapInFlightRef.current.has(loc.busId)) {
        const movedMeters = distanceMeters(prev.lat, prev.lng, loc.latitude, loc.longitude);
        // شروط مطابقة أكثر صرامة لتقليل طلبات OSRM وتسريع الأداء
        const shouldSnap = movedMeters >= 30 && (speedValue ?? 0) >= 15 && (accuracyValue == null || accuracyValue > 40);
        if (shouldSnap) {
          roadSnapInFlightRef.current.add(loc.busId);
          const coords = `${prev.lng},${prev.lat};${loc.longitude},${loc.latitude}`;
          fetch(`https://router.project-osrm.org/match/v1/driving/${coords}?geometries=geojson&overview=full&steps=false&radiuses=35;35`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              const tracePoint = data?.tracepoints?.[1]?.location;
              let snappedLat = loc.latitude;
              let snappedLng = loc.longitude;
              if (Array.isArray(tracePoint) && tracePoint.length >= 2) {
                snappedLng = tracePoint[0];
                snappedLat = tracePoint[1];
              }

              // حماية من انحرافات المطابقة: تجاهل snap إذا كان بعيداً عن GPS الحقيقي
              const snapOffset = distanceMeters(loc.latitude, loc.longitude, snappedLat, snappedLng);
              if (snapOffset > 45) {
                return;
              }

              let roadHeading: number | null = null;
              const geom = data?.matchings?.[0]?.geometry?.coordinates;
              if (Array.isArray(geom) && geom.length >= 2) {
                const p1 = geom[geom.length - 2];
                const p2 = geom[geom.length - 1];
                roadHeading = calcBearing(p1[1], p1[0], p2[1], p2[0]);
              }

              roadSnapRef.current.set(loc.busId, {
                heading: roadHeading,
                updatedAt: Date.now(),
              });

              const marker = markersRef.current.get(loc.busId);
              if (marker) {
                const stable = prevHeadingsRef.current.get(loc.busId);
                let refinedHeading = roadHeading ?? stable ?? null;
                if (refinedHeading != null && stable != null) {
                  const delta = shortestAngleDelta(stable, refinedHeading);
                  const maxStep = 120;
                  if (Math.abs(delta) > maxStep) {
                    refinedHeading = normalizeHeading(stable + Math.sign(delta) * maxStep);
                  }
                }

                if (refinedHeading != null) {
                  prevHeadingsRef.current.set(loc.busId, refinedHeading);
                }

                const newHeadingForIcon = refinedHeading ?? (prevDirectionRef.current.get(loc.busId) ?? 0);
                prevDirectionRef.current.set(loc.busId, newHeadingForIcon);
                // تحديث الدوران مباشرة على DOM لتعمل CSS transition بسلاسة
                setMarkerRotation(marker, newHeadingForIcon);
              }
            })
            .catch(() => {})
            .finally(() => {
              roadSnapInFlightRef.current.delete(loc.busId);
            });
        }
      }

      const roadSnap = roadSnapRef.current.get(loc.busId);
      const hasFreshRoadSnap = !!roadSnap && now - roadSnap.updatedAt <= 9000;
      const displayLat = loc.latitude;
      const displayLng = loc.longitude;
      
      // اتجاه منطقي: نعتمد على حركة المسار أولاً، مع تنعيم الزاوية ومنع القفزات
      const sensorHeading =
        typeof loc.heading === 'number' && Number.isFinite(loc.heading)
          ? normalizeHeading(loc.heading)
          : null;

      let movementHeading: number | null = null;
      let movedMetersSinceLast = 0;
      if (prev) {
        movedMetersSinceLast = distanceMeters(prev.lat, prev.lng, loc.latitude, loc.longitude);
        if (movedMetersSinceLast >= 8) {
          movementHeading = calcBearing(prev.lat, prev.lng, loc.latitude, loc.longitude);
        }
      }

      const lastStableHeading = prevHeadingsRef.current.get(loc.busId);
      const roadHeading = hasFreshRoadSnap ? roadSnap!.heading : null;

      let heading: number | null = null;
      if (!loc.isOnline) {
        heading = lastStableHeading ?? null;
      } else if (!prev && sensorHeading != null) {
        // أول ظهور للباص — استخدم اتجاه المستشعر فوراً
        heading = sensorHeading;
      } else if (movementHeading != null && roadHeading != null) {
        // دمج اتجاه الحركة الحقيقي مع اتجاه الطريق (سلوك أقرب لأوبر)
        heading = blendAngles(movementHeading, roadHeading, 0.75);
      } else if (movementHeading != null) {
        heading = movementHeading;
      } else if (roadHeading != null && sensorHeading != null && (speedValue ?? 0) > 8) {
        heading = blendAngles(sensorHeading, roadHeading, 0.8);
      } else if (sensorHeading != null && (speedValue == null || speedValue > 2)) {
        heading = sensorHeading;
      } else if (lastStableHeading != null) {
        heading = lastStableHeading;
      } else {
        heading = null;
      }

      if (heading != null && lastStableHeading != null) {
        const delta = shortestAngleDelta(lastStableHeading, heading);
        const isUTurnLike = Math.abs(delta) >= 120 && movedMetersSinceLast >= 15;
        // خطوة أقصى 90° لتصحيح سريع مع منع القفزات الحادة
        const maxStep = isUTurnLike ? 180 : 90;
        if (Math.abs(delta) > maxStep) {
          heading = normalizeHeading(lastStableHeading + Math.sign(delta) * maxStep);
        }
      }

      if (heading != null) {
        prevHeadingsRef.current.set(loc.busId, heading);
      }

      // اتجاه الأيقونة — زاوية مستمرة
      const continuousHeading = heading ?? (prevDirectionRef.current.get(loc.busId) ?? 0);
      if (heading != null) prevDirectionRef.current.set(loc.busId, continuousHeading);

      // setIcon فقط عند تغيير الحالة (online/selected) — التدوير يتم عبر DOM مباشرة
      const statusKey = `${loc.isOnline ? 1 : 0}_${loc.busId === selectedBus ? 1 : 0}`;
      const prevStatus = prevStatusRef.current.get(loc.busId);
      const statusChanged = prevStatus !== statusKey;
      prevStatusRef.current.set(loc.busId, statusKey);
      const icon = statusChanged || !existing
        ? createBusIcon(loc.isOnline, loc.busId === selectedBus, continuousHeading, loc.busNumber)
        : null;

      const timeDiff = Math.floor((Date.now() - new Date(loc.lastUpdate).getTime()) / 1000);
      const timeAgo = timeDiff < 60 ? `${timeDiff} ثانية` : timeDiff < 3600 ? `${Math.floor(timeDiff/60)} دقيقة` : `${Math.floor(timeDiff/3600)} ساعة`;
      const statusText = loc.isOnline ? (loc.isCellTower ? '🟠 متصل (برج خلوي)' : '🟢 متصل الآن') : loc.hasLocation === false ? '⏳ بانتظار التتبع' : '🔴 غير متصل';
      const statusColor = loc.isOnline ? (loc.isCellTower ? '#FF9800' : '#0f9d58') : loc.hasLocation === false ? '#FF9800' : '#ea4335';
      
      const popupContent = `
        <div dir="rtl" style="text-align: right; min-width: 220px; font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="
              width: 44px; height: 44px;
              background: linear-gradient(135deg, #FFD600, #F9A825);
              border-radius: 12px;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 2px 8px rgba(249,168,37,0.3);
            ">
              <div style="width:26px;height:26px;">${busTopDownSVG('#F9A825', '1')}</div>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">باص ${loc.busNumber}</h3>
              <span style="font-size: 11px; padding: 2px 10px; border-radius: 20px; color: white; background: ${statusColor}; font-weight: 600;">
                ${statusText}
              </span>
            </div>
          </div>
          <div style="background: #f8fafc; border-radius: 10px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; color: #475569;">
              <span style="font-weight: 600;">${loc.speed?.toFixed(0) || 0} كم/س</span>
              <span>⚡ السرعة</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; color: #475569;">
              <span style="font-weight: 600;">${loc.district}</span>
              <span>📍 الحي</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; color: #475569;">
              <span style="font-weight: 600;">${heading != null ? `${heading.toFixed(0)}°` : '—'}</span>
              <span>🧭 الاتجاه</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; color: #94a3b8;">
              <span>منذ ${timeAgo}</span>
              <span>🕐 آخر تحديث</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; color: #94a3b8;">
              <span>${accuracyValue != null ? `${accuracyValue.toFixed(0)} م` : '—'}</span>
              <span>🎯 دقة GPS</span>
            </div>
            ${loc.isCellTower ? `<div style="margin-top: 8px; padding: 6px 8px; background: #fff3e0; border-radius: 6px; border: 1px solid #ffe0b2;">
              <p style="font-size: 11px; color: #e65100; font-weight: 700; margin: 0;">⚠️ الموقع تقريبي (برج خلوي)</p>
              <p style="font-size: 10px; color: #bf360c; margin: 2px 0 0;">الهاتف لا يستخدم GPS — الخطأ قد يصل ${accuracyValue ? accuracyValue.toFixed(0) : '2000'}م</p>
            </div>` : ''}
          </div>
        </div>
      `;

      // حفظ الموقع الحالي للمقارنة مع التحديث القادم
      prevLocationsRef.current.set(loc.busId, { lat: loc.latitude, lng: loc.longitude });

      if (existing) {
        // تحريك العلامة بسلاسة بدل القفز المباشر
        if (!isFirstRenderRef.current) {
          animateMarker(existing, displayLat, displayLng, 1500);
        } else {
          existing.setLatLng([displayLat, displayLng]);
        }
        // setIcon فقط عند تغيير الحالة، وإلا نحدّث الدوران مباشرة على DOM
        if (icon) {
          existing.setIcon(icon);
        } else {
          setMarkerRotation(existing, continuousHeading);
        }
        existing.getPopup()?.setContent(popupContent);
      } else {
        const newIcon = icon ?? createBusIcon(loc.isOnline, loc.busId === selectedBus, continuousHeading, loc.busNumber);
        const marker = L.marker([displayLat, displayLng], { icon: newIcon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 280, className: 'bus-popup' });

        marker.on("click", () => onSelectBus(loc.busId));
        markersRef.current.set(loc.busId, marker);
      }
    });

    isFirstRenderRef.current = false;

    // عند اختيار باص — ننقل المركز فقط بدون تغيير الزوم
    const busJustSelected = selectedBus && selectedBus !== prevSelectedBusRef.current;
    prevSelectedBusRef.current = selectedBus;

    if (busJustSelected) {
      const selectedLoc = locations.find((l) => l.busId === selectedBus);
      if (selectedLoc) {
        map.panTo([selectedLoc.latitude, selectedLoc.longitude], { animate: true, duration: 0.8 });
        markersRef.current.get(selectedBus)?.openPopup();
      }
    }
  }, [locations, selectedBus, onSelectBus]);

  // جلب مسار الباص المحدد — فقط عند تغيير الاختيار (ليس كل تحديث)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBus) return;

    const selectedLoc = locations.find(l => l.busId === selectedBus);
    if (!selectedLoc || !selectedLoc.isOnline) return;

    const controller = new AbortController();

    fetch(`/Performance/api/tracking?busId=${selectedBus}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : [])
      .then(async (history: { latitude: number; longitude: number; timestamp: string; speed?: number }[]) => {
        if (history.length < 2) return;
        
        const sorted = [...history].reverse();
        const gpsPoints = sorted.map(h => [h.latitude, h.longitude] as [number, number]);
        
        const coords = sorted.map(h => `${h.longitude},${h.latitude}`).join(';');
        const timestamps = sorted.map(h => Math.floor(new Date(h.timestamp).getTime() / 1000)).join(';');
        const radiuses = sorted.map(() => '25').join(';');
        
        try {
          const matchRes = await fetch(
            `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&timestamps=${timestamps}&radiuses=${radiuses}`,
            { signal: controller.signal }
          );
          const matchData = await matchRes.json();
          
          if (matchData?.matchings?.[0]?.geometry?.coordinates) {
            for (const matching of matchData.matchings) {
              const roadPoints = matching.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]] as [number, number]
              );
              
              const shadowRoute = L.polyline(roadPoints, {
                color: '#000', weight: 7, opacity: 0.05, smoothFactor: 1,
              }).addTo(map);
              routeLinesRef.current.push(shadowRoute);

              const busRoute = L.polyline(roadPoints, {
                color: '#0f9d58', weight: 4, opacity: 0.7,
                smoothFactor: 1, lineCap: 'round', lineJoin: 'round',
              }).addTo(map);
              routeLinesRef.current.push(busRoute);

              const animatedLine = L.polyline(roadPoints, {
                color: '#34A853', weight: 2, opacity: 0.75,
                dashArray: '5, 12', smoothFactor: 1,
              }).addTo(map);
              routeLinesRef.current.push(animatedLine);
            }

            const startMarker = L.circleMarker(gpsPoints[0], {
              radius: 6, fillColor: '#4CAF50', color: 'white',
              weight: 2, fillOpacity: 1,
            }).addTo(map).bindTooltip('بداية المسار', { direction: 'top' });
            routeLinesRef.current.push(startMarker as unknown as L.Polyline);

            const endMarker = L.circleMarker(gpsPoints[gpsPoints.length - 1], {
              radius: 6, fillColor: '#EA4335', color: 'white',
              weight: 2, fillOpacity: 1,
            }).addTo(map).bindTooltip('الموقع الحالي', { direction: 'top' });
            routeLinesRef.current.push(endMarker as unknown as L.Polyline);
          } else {
            const layers = drawDirectGPSPath(map, gpsPoints);
            layers.forEach(l => routeLinesRef.current.push(l as unknown as L.Polyline));
          }
        } catch {
          if (!controller.signal.aborted) {
            const layers = drawDirectGPSPath(map, gpsPoints);
            layers.forEach(l => routeLinesRef.current.push(l as unknown as L.Polyline));
          }
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
      routeLinesRef.current.forEach(line => line.remove());
      routeLinesRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBus]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px] md:h-[600px] rounded-xl z-0"
      style={{ direction: "ltr" }}
    />
  );
}

// تصدير إحداثيات جدة للاستخدام في مكونات أخرى
export const JEDDAH_CENTER = { lat: 21.4858, lng: 39.1925 };
