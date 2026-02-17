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

// أيقونة باص 3D — 8 اتجاهات (صور PNG حقيقية بدل SVG)
// الاتجاهات المتاحة: 0(أمام), 45(أمام-يمين), 90(يمين), 135(خلف-يمين),
//                   180(خلف), 225(خلف-يسار), 270(يسار), 315(أمام-يسار)
const BUS_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
type BusDirection = typeof BUS_DIRECTIONS[number];

// اختيار أقرب اتجاه من الـ 8 بناءً على زاوية GPS heading
function snapToEightDirections(heading: number): BusDirection {
  const normalized = ((heading % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return BUS_DIRECTIONS[index];
}

function getBusIconUrl(direction: BusDirection): string {
  return `/Performance/icons/bus/bus-${direction}.png`;
}

// حقن CSS الأيقونة مرة واحدة فقط (بدل تكرارها لكل علامة)
let busStyleInjected = false;
function ensureBusStyles() {
  if (busStyleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    .bus-marker-icon{background:none!important;border:none!important;}
    @keyframes busGlow {
      0%, 100% { transform: scale(0.9); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.85; }
    }
  `;
  document.head.appendChild(style);
  busStyleInjected = true;
}

const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  ensureBusStyles();
  const direction = heading != null && Number.isFinite(heading) ? snapToEightDirections(heading) : 0;
  const iconUrl = getBusIconUrl(direction);

  // حجم صغير متناسب مع الخريطة
  const scale = isSelected ? 1.15 : 1;
  const w = Math.round(24 * scale);
  const h = Math.round(28 * scale);

  const accent = isSelected ? '#1A73E8' : isOnline ? '#4CAF50' : '#9E9E9E';
  const opacity = isOnline ? '1' : '0.4';
  const totalW = w + 6;
  const totalH = h + (busNumber ? 12 : 2);
  const glowColor = isOnline ? 'rgba(22,163,74,0.45)' : 'rgba(120,120,120,0.1)';

  return L.divIcon({
    className: "bus-marker-icon",
    html: `
      <div style="position:relative;width:${totalW}px;height:${totalH}px;overflow:visible;">
        ${isOnline ? `<div style="position:absolute;left:${totalW / 2 - 10}px;top:${h - 3}px;width:20px;height:7px;border-radius:999px;background:radial-gradient(ellipse at center, ${glowColor} 0%, rgba(22,163,74,0.15) 55%, rgba(22,163,74,0) 100%);filter:blur(1px);animation:busGlow 1.5s ease-in-out infinite;z-index:2;pointer-events:none;"></div>` : ''}
        <div style="position:absolute;top:1px;left:${(totalW - w) / 2}px;width:${w}px;height:${h}px;cursor:pointer;z-index:10;">
          <img src="${iconUrl}" width="${w}" height="${h}" style="display:block;opacity:${opacity};filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25))${!isOnline ? ' grayscale(0.5)' : ''};pointer-events:none;object-fit:contain;" />
        </div>
        ${isSelected ? `<div style="position:absolute;top:-1px;left:${(totalW - w - 4) / 2}px;width:${w + 4}px;height:${h + 2}px;border:2px solid ${accent};border-radius:6px;opacity:0.5;pointer-events:none;"></div>` : ''}
        ${busNumber ? `<div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.92);color:#333;font-size:6.5px;font-weight:700;padding:0 3px;border-radius:2px;white-space:nowrap;z-index:20;box-shadow:0 0.5px 1.5px rgba(0,0,0,0.1);border:0.5px solid #e0e0e0;line-height:11px;">${busNumber}</div>` : ''}
      </div>
    `,
    iconSize: [totalW, totalH],
    iconAnchor: [totalW / 2, h / 2 + 1],
    popupAnchor: [0, -(h / 2)],
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

// لم نعد نحتاج headingToIconRotation أو snapToFourDirections
// لأن الأيقونات الآن صور PNG مختلفة لكل اتجاه (8 اتجاهات)

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
  const prevDirectionRef = useRef<Map<string, BusDirection>>(new Map());
  const roadSnapRef = useRef<Map<string, { heading: number | null; updatedAt: number }>>(new Map());
  const roadSnapInFlightRef = useRef<Set<string>>(new Set());
  const isFirstRenderRef = useRef(true);
  const prevSelectedBusRef = useRef<string | null>(null);
  const userInteractedRef = useRef(false);

  // تهيئة الخريطة
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [21.4858, 39.1925], // جدة كمركز افتراضي
      zoom: 12,
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

    // تتبع تفاعل المستخدم مع الخريطة (زوم/سحب) لعدم إعادة ضبط العرض
    const onUserInteraction = () => { userInteractedRef.current = true; };
    map.on('zoomstart', onUserInteraction);
    map.on('dragstart', onUserInteraction);

    return () => {
      map.off('zoomstart', onUserInteraction);
      map.off('dragstart', onUserInteraction);
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

                const newDirection = refinedHeading != null
                  ? snapToEightDirections(refinedHeading)
                  : (prevDirectionRef.current.get(loc.busId) ?? 0);
                prevDirectionRef.current.set(loc.busId, newDirection);
                marker.setIcon(createBusIcon(loc.isOnline, loc.busId === selectedBus, newDirection, loc.busNumber));
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
        // حد أدنى 15م للحركة لتجنب اهتزاز الاتجاه من انحراف GPS
        if (movedMetersSinceLast >= 15) {
          movementHeading = calcBearing(prev.lat, prev.lng, loc.latitude, loc.longitude);
        }
      }

      const lastStableHeading = prevHeadingsRef.current.get(loc.busId);
      const roadHeading = hasFreshRoadSnap ? roadSnap!.heading : null;

      let heading: number | null = null;
      if (!loc.isOnline) {
        // عند الانقطاع لا نعرض اتجاه قديم مخزن في DB لأنه غالباً غير دقيق
        heading = lastStableHeading ?? null;
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
        const isUTurnLike = Math.abs(delta) >= 120 && movedMetersSinceLast >= 25;
        // خطوة أقصى 45° لمنع الدوران المفاجئ يمين/يسار
        const maxStep = isUTurnLike ? 160 : 45;
        if (Math.abs(delta) > maxStep) {
          heading = normalizeHeading(lastStableHeading + Math.sign(delta) * maxStep);
        }
      }

      if (heading != null) {
        prevHeadingsRef.current.set(loc.busId, heading);
      }

      // منع تبديل الاتجاه إلا إذا تحرك الباص فعلياً (هستيرية اتجاهية)
      const candidateDirection = heading != null
        ? snapToEightDirections(heading)
        : (prevDirectionRef.current.get(loc.busId) ?? 0);
      const lastDirection = prevDirectionRef.current.get(loc.busId);
      // لا تغيّر صورة الاتجاه إلا إذا الباص تحرك 15م على الأقل أو لا يوجد اتجاه سابق
      const currentDirection = (lastDirection != null && movedMetersSinceLast < 15)
        ? lastDirection
        : candidateDirection;
      prevDirectionRef.current.set(loc.busId, currentDirection);
      const icon = createBusIcon(loc.isOnline, loc.busId === selectedBus, currentDirection, loc.busNumber);

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
              <img src="${getBusIconUrl(0)}" width="22" height="26" style="display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.2));object-fit:contain;" />
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
        existing.setIcon(icon);
        existing.getPopup()?.setContent(popupContent);
      } else {
        const marker = L.marker([displayLat, displayLng], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 280, className: 'bus-popup' });

        marker.on("click", () => onSelectBus(loc.busId));
        markersRef.current.set(loc.busId, marker);
      }
    });

    isFirstRenderRef.current = false;

    // تحريك الخريطة للباص المحدد — فقط عند تغيير الاختيار (ليس كل تحديث)
    const busJustSelected = selectedBus && selectedBus !== prevSelectedBusRef.current;
    prevSelectedBusRef.current = selectedBus;

    if (busJustSelected) {
      const selectedLoc = locations.find((l) => l.busId === selectedBus);
      if (selectedLoc) {
        userInteractedRef.current = false;
        map.flyTo([selectedLoc.latitude, selectedLoc.longitude], 15, {
          duration: 0.8,
        });
        markersRef.current.get(selectedBus)?.openPopup();
      }
    } else if (!userInteractedRef.current && !selectedBus && locations.length > 0) {
      // fitBounds فقط إذا المستخدم لم يتفاعل مع الخريطة بعد
      const validLocations = locations.filter(l => l.hasLocation !== false);
      if (validLocations.length > 0) {
        const bounds = L.latLngBounds(
          validLocations.map((l) => [l.latitude, l.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
        // بعد أول fitBounds نعتبرها تفاعل لعدم التكرار
        userInteractedRef.current = true;
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
