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
  lastUpdate: string;
  isOnline: boolean;
  hasLocation?: boolean;
}

interface MapTrackerProps {
  locations: BusLocationData[];
  selectedBus: string | null;
  onSelectBus: (busId: string) => void;
}

// أيقونة سيارة بنمط أوبر (UberXL) من الأعلى - تصميم عصري أنيق
const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  const rotation = heading != null && heading > 0 ? heading : 0;
  const scale = isSelected ? 1.2 : 1;
  const w = Math.round(36 * scale);
  const h = Math.round(64 * scale);
  
  // ألوان بنمط أوبر - أسود أنيق
  const bodyColor = isOnline ? '#1A1A2E' : '#78909C';
  const bodyLight = isOnline ? '#2D2D44' : '#90A4AE';
  const bodyDark = isOnline ? '#0D0D1A' : '#546E7A';
  const glassColor = isOnline ? '#4FC3F7' : '#B0BEC5';
  const glassDark = isOnline ? '#0288D1' : '#78909C';
  const accentColor = isOnline ? '#00E676' : '#9E9E9E';
  const shadowColor = isSelected ? 'rgba(0,230,118,0.45)' : isOnline ? 'rgba(0,230,118,0.25)' : 'rgba(0,0,0,0.12)';
  const glowSize = isSelected ? 28 : isOnline ? 18 : 0;
  const uid = `${isOnline ? '1' : '0'}${isSelected ? 's' : 'n'}`;
  
  const svgBus = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 64" width="${w}" height="${h}">
      <defs>
        <linearGradient id="bd${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${bodyDark}"/>
          <stop offset="50%" stop-color="${bodyColor}"/>
          <stop offset="100%" stop-color="${bodyDark}"/>
        </linearGradient>
        <linearGradient id="rf${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${bodyLight}"/>
          <stop offset="100%" stop-color="${bodyColor}"/>
        </linearGradient>
        <linearGradient id="gl${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${glassColor}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="${glassDark}" stop-opacity="0.85"/>
        </linearGradient>
        <linearGradient id="sh${uid}" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="white" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
        <filter id="ds${uid}">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      
      <!-- ظل السيارة -->
      <ellipse cx="18" cy="61" rx="14" ry="3" fill="rgba(0,0,0,0.12)"/>
      
      <!-- جسم السيارة - شكل أوبر الانسيابي -->
      <path d="M8,10 C8,6 10,3 18,3 C26,3 28,6 28,10 L30,18 L30,48 L28,56 C28,59 26,61 18,61 C10,61 8,59 8,56 L6,48 L6,18 Z" 
        fill="url(#bd${uid})" filter="url(#ds${uid})"/>
      
      <!-- حافة الجسم الخارجية -->
      <path d="M8,10 C8,6 10,3 18,3 C26,3 28,6 28,10 L30,18 L30,48 L28,56 C28,59 26,61 18,61 C10,61 8,59 8,56 L6,48 L6,18 Z" 
        fill="none" stroke="${bodyDark}" stroke-width="0.8" opacity="0.6"/>
      
      <!-- غطاء المحرك الأمامي -->
      <path d="M10,10 C10,7 12,5 18,5 C24,5 26,7 26,10 L26,15 L10,15 Z" 
        fill="url(#rf${uid})"/>
      
      <!-- الزجاج الأمامي - منحني بنمط أوبر -->
      <path d="M10,15 L26,15 L25,24 C25,25 24,26 18,26 C12,26 11,25 11,24 Z" 
        fill="url(#gl${uid})"/>
      <!-- انعكاس الزجاج -->
      <path d="M12,16 L20,16 L19,22 C19,23 18,23 16,23 C14,23 13,23 13,22 Z" 
        fill="white" opacity="0.15"/>
      
      <!-- السقف -->
      <rect x="9" y="27" width="18" height="16" rx="2" fill="url(#rf${uid})"/>
      
      <!-- لمعان السقف -->
      <rect x="11" y="28" width="7" height="13" rx="2" fill="url(#sh${uid})"/>
      
      <!-- الزجاج الخلفي -->
      <path d="M11,44 L25,44 L26,49 C26,50 24,52 18,52 C12,52 10,50 10,49 Z" 
        fill="url(#gl${uid})" opacity="0.8"/>
      
      <!-- صندوق خلفي -->
      <path d="M10,52 C10,52 12,55 18,55 C24,55 26,52 26,52 L27,56 C27,58 24,59 18,59 C12,59 9,58 9,56 Z" 
        fill="url(#rf${uid})"/>
      
      <!-- المرايا الجانبية -->
      <ellipse cx="5" cy="18" rx="2" ry="1.5" fill="${bodyColor}" stroke="${bodyDark}" stroke-width="0.5"/>
      <ellipse cx="31" cy="18" rx="2" ry="1.5" fill="${bodyColor}" stroke="${bodyDark}" stroke-width="0.5"/>
      
      <!-- العجلات الأمامية -->
      <rect x="3" y="14" width="4" height="7" rx="2" fill="#111111" stroke="#333" stroke-width="0.5"/>
      <rect x="29" y="14" width="4" height="7" rx="2" fill="#111111" stroke="#333" stroke-width="0.5"/>
      <!-- إطارات أمامية -->
      <line x1="5" y1="15.5" x2="5" y2="19.5" stroke="#444" stroke-width="0.5" opacity="0.5"/>
      <line x1="31" y1="15.5" x2="31" y2="19.5" stroke="#444" stroke-width="0.5" opacity="0.5"/>
      
      <!-- العجلات الخلفية -->
      <rect x="3" y="44" width="4" height="7" rx="2" fill="#111111" stroke="#333" stroke-width="0.5"/>
      <rect x="29" y="44" width="4" height="7" rx="2" fill="#111111" stroke="#333" stroke-width="0.5"/>
      <!-- إطارات خلفية -->
      <line x1="5" y1="45.5" x2="5" y2="49.5" stroke="#444" stroke-width="0.5" opacity="0.5"/>
      <line x1="31" y1="45.5" x2="31" y2="49.5" stroke="#444" stroke-width="0.5" opacity="0.5"/>
      
      <!-- الأنوار الأمامية LED -->
      <path d="M10,6 Q12,5 14,6" stroke="${isOnline ? '#FFFFFF' : '#90A4AE'}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="${isOnline ? '1' : '0.5'}"/>
      <path d="M22,6 Q24,5 26,6" stroke="${isOnline ? '#FFFFFF' : '#90A4AE'}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="${isOnline ? '1' : '0.5'}"/>
      ${isOnline ? `
        <path d="M11,7 Q13,6.5 14,7" stroke="${accentColor}" stroke-width="0.8" fill="none" opacity="0.6"/>
        <path d="M22,7 Q24,6.5 25,7" stroke="${accentColor}" stroke-width="0.8" fill="none" opacity="0.6"/>
      ` : ''}
      
      <!-- الأنوار الخلفية LED -->
      <path d="M10,58 Q12,59 14,58" stroke="${isOnline ? '#FF1744' : '#78909C'}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M22,58 Q24,59 26,58" stroke="${isOnline ? '#FF1744' : '#78909C'}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      
      <!-- خط جانبي أنيق -->
      <line x1="7" y1="20" x2="7" y2="46" stroke="${accentColor}" stroke-width="0.6" opacity="${isOnline ? '0.4' : '0.15'}"/>
      <line x1="29" y1="20" x2="29" y2="46" stroke="${accentColor}" stroke-width="0.6" opacity="${isOnline ? '0.4' : '0.15'}"/>

      ${isSelected ? `
        <!-- حلقة التحديد -->
        <ellipse cx="18" cy="32" rx="20" ry="34" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.4" stroke-dasharray="3,3"/>
      ` : ''}
    </svg>
  `;

  const encodedSvg = encodeURIComponent(svgBus);

  return L.divIcon({
    className: "bus-3d-icon",
    html: `
      <div style="
        position: relative; 
        width: ${w + glowSize * 2}px; 
        height: ${h + glowSize * 2}px;
        margin-left: -${glowSize}px;
        margin-top: -${glowSize}px;
      ">
        ${isOnline || isSelected ? `
        <div style="
          position: absolute;
          width: ${w + glowSize * 2}px;
          height: ${h + glowSize * 2}px;
          border-radius: 50%;
          background: radial-gradient(circle, ${shadowColor} 0%, transparent 70%);
          animation: ${isOnline ? 'busGlow 2.5s ease-in-out infinite' : 'none'};
          top: 0; left: 0;
        "></div>` : ''}
        <div style="
          position: absolute;
          top: ${glowSize}px;
          left: ${glowSize}px;
          width: ${w}px;
          height: ${h}px;
          transform: rotate(${rotation}deg);
          transform-origin: center center;
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          z-index: 10;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
        ">
          <img src="data:image/svg+xml,${encodedSvg}" width="${w}" height="${h}" style="display:block;" />
        </div>
        ${busNumber ? `
        <div style="
          position: absolute;
          bottom: ${glowSize - 14}px;
          left: 50%;
          transform: translateX(-50%);
          background: ${isOnline ? '#1A1A2E' : '#78909C'};
          color: ${isOnline ? '#00E676' : 'white'};
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
          z-index: 20;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 1.5px solid ${isOnline ? '#00E676' : '#B0BEC5'};
          letter-spacing: 0.5px;
        ">${busNumber}</div>` : ''}
      </div>
      <style>
        @keyframes busGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        .bus-3d-icon { background: none !important; border: none !important; }
      </style>
    `,
    iconSize: [w + glowSize * 2, h + glowSize * 2],
    iconAnchor: [(w + glowSize * 2) / 2, (h + glowSize * 2) / 2],
    popupAnchor: [0, -(h / 2) - glowSize],
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

export default function MapTracker({
  locations,
  selectedBus,
  onSelectBus,
}: MapTrackerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

    return () => {
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
      }
    });

    // حذف خطوط المسارات القديمة
    routeLinesRef.current.forEach(line => line.remove());
    routeLinesRef.current = [];

    // رسم خطوط المسارات بين الباصات المتصلة عبر الطرقات الحقيقية
    const onlineBuses = locations.filter(l => l.isOnline && l.hasLocation !== false);
    if (onlineBuses.length >= 2) {
      // الحصول على مسار حقيقي عبر الطرقات باستخدام OSRM
      const coords = onlineBuses.map(l => `${l.longitude},${l.latitude}`).join(';');
      fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.routes?.[0]?.geometry?.coordinates) {
            const roadPoints = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            
            // خط المسار الخلفي (ظل)
            const shadowLine = L.polyline(roadPoints, {
              color: '#000',
              weight: 8,
              opacity: 0.08,
              smoothFactor: 1,
            }).addTo(map);
            routeLinesRef.current.push(shadowLine);

            // خط المسار الرئيسي على الطريق
            const mainLine = L.polyline(roadPoints, {
              color: '#4285F4',
              weight: 5,
              opacity: 0.7,
              smoothFactor: 1,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(map);
            routeLinesRef.current.push(mainLine);

            // خط متقطع فوق المسار
            const dashLine = L.polyline(roadPoints, {
              color: '#1a73e8',
              weight: 3,
              opacity: 0.5,
              smoothFactor: 1,
              dashArray: '8, 12',
            }).addTo(map);
            routeLinesRef.current.push(dashLine);
          }
          
          // نقاط الباصات كمحطات
          onlineBuses.forEach(bus => {
            const stationDot = L.circleMarker([bus.latitude, bus.longitude], {
              radius: 6,
              fillColor: '#1a73e8',
              color: 'white',
              weight: 2.5,
              fillOpacity: 0.9,
            }).addTo(map);
            routeLinesRef.current.push(stationDot as unknown as L.Polyline);
          });
        })
        .catch(() => {
          // fallback: خط مستقيم إذا فشل OSRM
          const routePoints = onlineBuses.map(l => [l.latitude, l.longitude] as [number, number]);
          const fallbackLine = L.polyline(routePoints, {
            color: '#1a73e8',
            weight: 4,
            opacity: 0.5,
            dashArray: '10, 8',
          }).addTo(map);
          routeLinesRef.current.push(fallbackLine);
        });
    }

    // إذا تم اختيار باص، جلب وعرض مساره السابق مطابق للطرقات
    if (selectedBus) {
      const selectedLoc = locations.find(l => l.busId === selectedBus);
      if (selectedLoc && selectedLoc.isOnline) {
        fetch(`/Performance/api/tracking?busId=${selectedBus}`)
          .then(res => res.ok ? res.json() : [])
          .then(async (history: { latitude: number; longitude: number; timestamp: string; speed?: number }[]) => {
            if (history.length < 2) return;
            
            // ترتيب من الأقدم للأحدث
            const sorted = [...history].reverse();
            const gpsPoints = sorted.map(h => [h.latitude, h.longitude] as [number, number]);
            
            // استخدام OSRM Match API لمطابقة نقاط GPS مع الطرقات الحقيقية
            const coords = sorted.map(h => `${h.longitude},${h.latitude}`).join(';');
            const timestamps = sorted.map(h => Math.floor(new Date(h.timestamp).getTime() / 1000)).join(';');
            const radiuses = sorted.map(() => '25').join(';'); // دقة 25 متر
            
            try {
              const matchRes = await fetch(
                `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&timestamps=${timestamps}&radiuses=${radiuses}`
              );
              const matchData = await matchRes.json();
              
              if (matchData?.matchings?.[0]?.geometry?.coordinates) {
                // رسم جميع المطابقات
                for (const matching of matchData.matchings) {
                  const roadPoints = matching.geometry.coordinates.map(
                    (c: [number, number]) => [c[1], c[0]] as [number, number]
                  );
                  
                  // ظل المسار
                  const shadowRoute = L.polyline(roadPoints, {
                    color: '#000',
                    weight: 8,
                    opacity: 0.06,
                    smoothFactor: 1,
                  }).addTo(map);
                  routeLinesRef.current.push(shadowRoute);

                  // خط المسار الرئيسي - أخضر على الطريق 
                  const busRoute = L.polyline(roadPoints, {
                    color: '#0f9d58',
                    weight: 5,
                    opacity: 0.75,
                    smoothFactor: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }).addTo(map);
                  routeLinesRef.current.push(busRoute);

                  // خط متحرك فوقه
                  const animatedLine = L.polyline(roadPoints, {
                    color: '#34A853',
                    weight: 2.5,
                    opacity: 0.8,
                    dashArray: '6, 14',
                    smoothFactor: 1,
                  }).addTo(map);
                  routeLinesRef.current.push(animatedLine);
                }

                // نقطة البداية 
                const startPoint = gpsPoints[0];
                const startMarker = L.circleMarker(startPoint, {
                  radius: 8,
                  fillColor: '#4CAF50',
                  color: 'white',
                  weight: 3,
                  fillOpacity: 1,
                }).addTo(map).bindTooltip('بداية المسار', { 
                  direction: 'top', 
                  className: 'route-tooltip',
                  permanent: false,
                });
                routeLinesRef.current.push(startMarker as unknown as L.Polyline);

                // نقطة النهاية (الموقع الحالي)
                const endPoint = gpsPoints[gpsPoints.length - 1];
                const endMarker = L.circleMarker(endPoint, {
                  radius: 8,
                  fillColor: '#EA4335',
                  color: 'white',
                  weight: 3,
                  fillOpacity: 1,
                }).addTo(map).bindTooltip('الموقع الحالي', { 
                  direction: 'top', 
                  className: 'route-tooltip',
                  permanent: false,
                });
                routeLinesRef.current.push(endMarker as unknown as L.Polyline);

                // نقاط GPS المسجلة على طول المسار
                gpsPoints.forEach((point, i) => {
                  if (i === 0 || i === gpsPoints.length - 1) return; // تخطي البداية والنهاية
                  const dot = L.circleMarker(point, {
                    radius: 3,
                    fillColor: '#0f9d58',
                    color: 'white',
                    weight: 1.5,
                    fillOpacity: 0.6,
                  }).addTo(map);
                  routeLinesRef.current.push(dot as unknown as L.Polyline);
                });

              } else {
                // fallback: رسم GPS مباشرة إذا فشلت المطابقة
                const layers = drawDirectGPSPath(map, gpsPoints);
                layers.forEach(l => routeLinesRef.current.push(l as unknown as L.Polyline));
              }
            } catch {
              // fallback: رسم GPS مباشرة
              const layers = drawDirectGPSPath(map, gpsPoints);
              layers.forEach(l => routeLinesRef.current.push(l as unknown as L.Polyline));
            }
          })
          .catch(() => {});
      }
    }

    // تحديث أو إضافة العلامات
    locations.forEach((loc) => {
      const existing = markersRef.current.get(loc.busId);
      const icon = createBusIcon(loc.isOnline, loc.busId === selectedBus, loc.heading, loc.busNumber);

      const timeDiff = Math.floor((Date.now() - new Date(loc.lastUpdate).getTime()) / 1000);
      const timeAgo = timeDiff < 60 ? `${timeDiff} ثانية` : timeDiff < 3600 ? `${Math.floor(timeDiff/60)} دقيقة` : `${Math.floor(timeDiff/3600)} ساعة`;
      const statusText = loc.isOnline ? '🟢 متصل الآن' : loc.hasLocation === false ? '⏳ بانتظار التتبع' : '🔴 غير متصل';
      const statusColor = loc.isOnline ? '#0f9d58' : loc.hasLocation === false ? '#FF9800' : '#ea4335';
      
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
              <span style="font-size: 22px;">🚌</span>
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
              <span style="font-weight: 600;">${loc.heading?.toFixed(0) || 0}°</span>
              <span>🧭 الاتجاه</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; color: #94a3b8;">
              <span>منذ ${timeAgo}</span>
              <span>🕐 آخر تحديث</span>
            </div>
          </div>
        </div>
      `;

      if (existing) {
        existing.setLatLng([loc.latitude, loc.longitude]);
        existing.setIcon(icon);
        existing.getPopup()?.setContent(popupContent);
      } else {
        const marker = L.marker([loc.latitude, loc.longitude], { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 280, className: 'bus-popup' });

        marker.on("click", () => onSelectBus(loc.busId));
        markersRef.current.set(loc.busId, marker);
      }
    });

    // تحريك الخريطة للباص المحدد
    if (selectedBus) {
      const selectedLoc = locations.find((l) => l.busId === selectedBus);
      if (selectedLoc) {
        map.flyTo([selectedLoc.latitude, selectedLoc.longitude], 15, {
          duration: 1,
        });
        markersRef.current.get(selectedBus)?.openPopup();
      }
    } else if (locations.length > 0) {
      const validLocations = locations.filter(l => l.hasLocation !== false);
      if (validLocations.length > 0) {
        const bounds = L.latLngBounds(
          validLocations.map((l) => [l.latitude, l.longitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
      }
    }
  }, [locations, selectedBus, onSelectBus]);

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
