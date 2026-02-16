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

// أيقونة ميني فان UberXL ثلاثية الأبعاد - منظور isometric (أعلى + جانب أيمن)
const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  const rotation = heading != null && heading > 0 ? heading : 0;
  const scale = isSelected ? 1.15 : 1;
  const w = Math.round(52 * scale);
  const h = Math.round(66 * scale);
  
  // ألوان - أبيض نظيف ثلاثي الأبعاد
  const bodyTop    = isOnline ? '#FAFAFA' : '#B0BEC5';
  const bodyMid    = isOnline ? '#F0F0F0' : '#9EB0BA';
  const bodySide   = isOnline ? '#E2E2E2' : '#8A9DAA';
  const bodyShadow = isOnline ? '#CCCCCC' : '#748A96';
  const bodyEdge   = isOnline ? '#C0C0C0' : '#607D8B';
  const glassTop   = isOnline ? '#6B7B8D' : '#8A9DAA';
  const glassMid   = isOnline ? '#4A5568' : '#748792';
  const glassDark  = isOnline ? '#2D3748' : '#5A6E7C';
  const wheelColor = '#1A1A1A';
  const hubCap     = '#3A3A3A';
  const hubDot     = '#5A5A5A';
  const ledColor   = isOnline ? '#FFFFFF' : '#9E9E9E';
  const rearLed    = isOnline ? '#FF8C00' : '#90A4AE';
  const mirrorCol  = isOnline ? '#2D3748' : '#607D8B';
  const accentColor  = isSelected ? '#1A73E8' : isOnline ? '#4CAF50' : '#9E9E9E';
  const shadowColor  = isSelected ? 'rgba(26,115,232,0.4)' : isOnline ? 'rgba(76,175,80,0.2)' : 'rgba(0,0,0,0.06)';
  const glowSize     = isSelected ? 22 : isOnline ? 12 : 0;
  const uid = `v${isOnline ? '1' : '0'}${isSelected ? 's' : 'n'}`;
  
  const svgCar = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 86" width="${w}" height="${h}">
      <defs>
        <linearGradient id="tp${uid}" x1="0" y1="0" x2="1" y2="0.8">
          <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
          <stop offset="40%" stop-color="${bodyTop}"/>
          <stop offset="100%" stop-color="${bodyMid}"/>
        </linearGradient>
        <linearGradient id="sw${uid}" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stop-color="${bodySide}"/>
          <stop offset="100%" stop-color="${bodyShadow}"/>
        </linearGradient>
        <linearGradient id="gl${uid}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="${glassTop}"/>
          <stop offset="45%" stop-color="${glassMid}"/>
          <stop offset="100%" stop-color="${glassDark}"/>
        </linearGradient>
        <linearGradient id="hl${uid}" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
        <filter id="ds${uid}">
          <feDropShadow dx="2" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.18)"/>
        </filter>
        <filter id="gb${uid}">
          <feGaussianBlur stdDeviation="0.6"/>
        </filter>
      </defs>

      <!-- ===== ظل الأرض ===== -->
      <ellipse cx="37" cy="83" rx="24" ry="4.5" fill="rgba(0,0,0,0.07)"/>

      <!-- ===== الجدار الأيمن (العمق ثلاثي الأبعاد) ===== -->
      <path d="
        M48,14 Q54,18 56,26
        L56,56 Q54,66 48,72
        L46,70 Q50,64 52,56
        L52,26 Q50,20 46,16 Z"
        fill="url(#sw${uid})"/>
      <!-- حافة سفلية -->
      <path d="
        M18,74 Q32,80 46,74
        L56,64 Q56,70 48,76
        Q32,82 18,78 Q12,74 12,68 Z"
        fill="${bodyShadow}" opacity="0.3"/>

      <!-- ===== الجسم العلوي الرئيسي ===== -->
      <path d="
        M24,8 Q34,3 44,8
        Q50,12 52,22 L52,56
        Q50,66 44,72 Q34,78 24,72
        Q16,66 14,56 L14,22
        Q16,12 24,8 Z"
        fill="url(#tp${uid})" filter="url(#ds${uid})"/>
      <path d="
        M24,8 Q34,3 44,8
        Q50,12 52,22 L52,56
        Q50,66 44,72 Q34,78 24,72
        Q16,66 14,56 L14,22
        Q16,12 24,8 Z"
        fill="none" stroke="${bodyEdge}" stroke-width="0.4" opacity="0.4"/>

      <!-- ===== غطاء المحرك ===== -->
      <path d="
        M26,10 Q34,6 42,10
        Q48,14 48,20 L48,30
        L18,30 L18,20
        Q18,14 26,10 Z"
        fill="url(#tp${uid})"/>
      <!-- لمعان الغطاء الأمامي -->
      <path d="M28,11 Q34,8 40,11 L38,22 L24,22 Z"
        fill="white" opacity="0.2"/>

      <!-- ===== شريط LED الأمامي ===== -->
      <path d="M26,7.5 Q34,3.5 42,7.5"
        stroke="${ledColor}" stroke-width="2.5" fill="none"
        stroke-linecap="round" filter="url(#gb${uid})"
        opacity="${isOnline ? '1' : '0.35'}"/>
      ${isOnline ? `
      <path d="M28,8 Q34,5 40,8"
        stroke="white" stroke-width="0.8" fill="none"
        stroke-linecap="round" opacity="0.5"/>` : ''}

      <!-- ===== الزجاج الأمامي (كبير، منحني) ===== -->
      <path d="
        M20,30 L48,30
        L46,44 Q44,46 34,46
        Q22,46 20,44 Z"
        fill="url(#gl${uid})"/>
      <path d="
        M20,30 L48,30
        L46,44 Q44,46 34,46
        Q22,46 20,44 Z"
        fill="none" stroke="${bodyTop}" stroke-width="1.3"/>
      <!-- انعكاس الزجاج -->
      <path d="M24,32 L35,32 L34,42 Q30,43 26,42 Z"
        fill="white" opacity="0.08"/>

      <!-- ===== السقف ===== -->
      <path d="
        M22,46 L44,46
        L44,60 Q42,62 34,62
        Q24,62 22,60 Z"
        fill="url(#tp${uid})"/>
      <!-- لمعان السقف ثلاثي الأبعاد -->
      <path d="M24,47 L34,47 L34,60 Q30,61 24,59 Z"
        fill="url(#hl${uid})"/>

      <!-- ===== نوافذ الجانب الأيمن (على الجدار) ===== -->
      <path d="
        M48,32 L55,26
        L56,36 L56,54
        L55,62 L48,58
        L48,46 Z"
        fill="${glassDark}" opacity="0.55"/>
      <!-- فواصل النوافذ -->
      <line x1="50" y1="40" x2="56" y2="38" stroke="${bodySide}" stroke-width="0.9" opacity="0.7"/>
      <line x1="49.5" y1="50" x2="55" y2="48" stroke="${bodySide}" stroke-width="0.9" opacity="0.7"/>

      <!-- ===== نوافذ الجانب الأيسر (خفيفة الرؤية) ===== -->
      <path d="M18,32 L14,26 L14,56 L16,62 L20,58 L20,46 Z"
        fill="${glassDark}" opacity="0.2"/>

      <!-- ===== الزجاج الخلفي ===== -->
      <path d="
        M24,62 L44,62
        L46,68 Q44,70 34,70
        Q24,70 22,68 Z"
        fill="url(#gl${uid})" opacity="0.6"/>
      <path d="
        M24,62 L44,62
        L46,68 Q44,70 34,70
        Q24,70 22,68 Z"
        fill="none" stroke="${bodyTop}" stroke-width="0.8"/>

      <!-- ===== المؤخرة ===== -->
      <path d="
        M22,70 Q24,74 34,76
        Q44,74 46,70
        L48,74 Q44,78 34,80
        Q24,78 20,74 Z"
        fill="${bodySide}"/>

      <!-- ===== العجلات ===== -->
      <!-- أمامي أيمن -->
      <ellipse cx="54" cy="22" rx="4.5" ry="3.2" fill="${wheelColor}"/>
      <ellipse cx="54" cy="22" rx="2.5" ry="1.8" fill="${hubCap}"/>
      <circle cx="54" cy="22" r="1" fill="${hubDot}"/>
      <!-- خلفي أيمن -->
      <ellipse cx="55" cy="62" rx="4.5" ry="3.2" fill="${wheelColor}"/>
      <ellipse cx="55" cy="62" rx="2.5" ry="1.8" fill="${hubCap}"/>
      <circle cx="55" cy="62" r="1" fill="${hubDot}"/>
      <!-- أمامي أيسر -->
      <ellipse cx="12" cy="20" rx="4" ry="2.8" fill="${wheelColor}"/>
      <ellipse cx="12" cy="20" rx="2.2" ry="1.5" fill="${hubCap}"/>
      <circle cx="12" cy="20" r="0.8" fill="${hubDot}"/>
      <!-- خلفي أيسر -->
      <ellipse cx="12" cy="60" rx="4" ry="2.8" fill="${wheelColor}"/>
      <ellipse cx="12" cy="60" rx="2.2" ry="1.5" fill="${hubCap}"/>
      <circle cx="12" cy="60" r="0.8" fill="${hubDot}"/>

      <!-- ===== المرايا الجانبية ===== -->
      <ellipse cx="10" cy="32" rx="2.5" ry="1.4" fill="${mirrorCol}" stroke="${bodyEdge}" stroke-width="0.3"/>
      <ellipse cx="56" cy="28" rx="2.5" ry="1.4" fill="${mirrorCol}" stroke="${bodyEdge}" stroke-width="0.3"/>

      <!-- ===== الإشارات الخلفية (برتقالي) ===== -->
      <circle cx="24" cy="75" r="1.6" fill="${rearLed}" opacity="0.9"/>
      <circle cx="44" cy="75" r="1.6" fill="${rearLed}" opacity="0.9"/>
      ${isOnline ? `
      <circle cx="24" cy="75" r="0.7" fill="white" opacity="0.5"/>
      <circle cx="44" cy="75" r="0.7" fill="white" opacity="0.5"/>` : ''}

      <!-- ===== لمعان ثلاثي الأبعاد ===== -->
      <path d="M28,6 Q34,4 40,6 L38,14 L26,14 Z"
        fill="white" opacity="0.14"/>
      <path d="M16,16 L14,30 L14,44 L16,48 L18,38 L18,22 Z"
        fill="white" opacity="0.05"/>

      ${isSelected ? `
      <ellipse cx="34" cy="42" rx="36" ry="44"
        fill="none" stroke="${accentColor}" stroke-width="1.2"
        opacity="0.35" stroke-dasharray="3,2.5"/>` : ''}
    </svg>
  `;

  const encodedSvg = encodeURIComponent(svgCar);

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
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.22));
        ">
          <img src="data:image/svg+xml,${encodedSvg}" width="${w}" height="${h}" style="display:block;" />
        </div>
        ${busNumber ? `
        <div style="
          position: absolute;
          bottom: ${glowSize - 14}px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.95);
          color: #1A1A2E;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 8px;
          white-space: nowrap;
          z-index: 20;
          box-shadow: 0 2px 6px rgba(0,0,0,0.18);
          border: 1px solid ${isOnline ? '#E0E0E0' : '#B0BEC5'};
          letter-spacing: 0.3px;
        ">${busNumber}</div>` : ''}
      </div>
      <style>
        @keyframes busGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.06); }
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
