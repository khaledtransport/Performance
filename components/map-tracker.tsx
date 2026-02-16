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

// أيقونة ميني فان UberXL — منظور 3/4 isometric (v4 - محسّن للحجم الصغير)
const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  const rotation = heading != null && heading > 0 ? heading : 0;
  const scale = isSelected ? 1.2 : 1;
  const w = Math.round(80 * scale);
  const h = Math.round(67 * scale);
  
  // ألوان — أبيض نظيف مع تباين عالي
  const bodyWhite   = isOnline ? '#FFFFFF' : '#B0BEC5';
  const bodyLight   = isOnline ? '#F5F5F5' : '#9EB0BA';
  const bodyMid     = isOnline ? '#E8E8E8' : '#8A9DAA';
  const bodySide    = isOnline ? '#D0D0D0' : '#7A8E9A';
  const bodyBottom  = isOnline ? '#BABABA' : '#6A808C';
  const glassLight  = isOnline ? '#5A6A7A' : '#7A8A94';
  const glassDark   = isOnline ? '#2A3444' : '#5A6A74';
  const wheelOuter  = '#0A0A0A';
  const wheelMid    = '#1A1A1A';
  const wheelInner  = '#3A3A3A';
  const ledStrip    = isOnline ? '#FFFFFF' : '#9E9E9E';
  const rearLight   = isOnline ? '#FF7700' : '#90A4AE';
  const mirrorDark  = isOnline ? '#2A2A2A' : '#5A6A74';
  const accentColor = isSelected ? '#1A73E8' : isOnline ? '#4CAF50' : '#9E9E9E';
  const shadowColor = isSelected ? 'rgba(26,115,232,0.4)' : isOnline ? 'rgba(76,175,80,0.2)' : 'rgba(0,0,0,0.06)';
  const glowSize    = isSelected ? 22 : isOnline ? 12 : 0;
  const uid = `m${isOnline ? '1' : '0'}${isSelected ? 's' : 'n'}`;
  
  const svgCar = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="${w}" height="${h}">
      <defs>
        <linearGradient id="bd${uid}" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stop-color="${bodyWhite}"/>
          <stop offset="100%" stop-color="${bodyMid}"/>
        </linearGradient>
        <linearGradient id="sd${uid}" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stop-color="${bodySide}"/>
          <stop offset="100%" stop-color="${bodyBottom}"/>
        </linearGradient>
        <linearGradient id="gd${uid}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="${glassLight}"/>
          <stop offset="100%" stop-color="${glassDark}"/>
        </linearGradient>
        <radialGradient id="wh${uid}">
          <stop offset="0%" stop-color="${wheelInner}"/>
          <stop offset="50%" stop-color="${wheelMid}"/>
          <stop offset="100%" stop-color="${wheelOuter}"/>
        </radialGradient>
        <filter id="ds${uid}" x="-5%" y="-5%" width="115%" height="120%">
          <feDropShadow dx="1" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,0.22)"/>
        </filter>
        <filter id="lg${uid}">
          <feGaussianBlur stdDeviation="1.2"/>
        </filter>
      </defs>

      <!-- ===== ظل أرضي ===== -->
      <ellipse cx="62" cy="96" rx="40" ry="5" fill="rgba(0,0,0,0.08)"/>

      <!-- ===== الجدار الأيمن (عمق 3D) ===== -->
      <path d="
        M90,22 Q100,28 104,40
        L104,68 Q100,80 90,86
        L86,82 Q94,76 96,68
        L96,40 Q94,30 86,26 Z"
        fill="url(#sd${uid})"/>

      <!-- ===== شريط سفلي ===== -->
      <path d="
        M30,85 Q55,94 82,88
        L96,80 Q100,86 90,92
        Q65,100 35,94
        Q22,90 22,82 Z"
        fill="${bodyBottom}" opacity="0.4"/>

      <!-- ===== الجسم الرئيسي (علوي) ===== -->
      <path d="
        M34,60 Q26,48 26,36
        Q26,18 38,12
        L80,8 Q96,12 98,28
        L100,60 Q96,76 84,84
        L48,86 Q34,80 34,60 Z"
        fill="url(#bd${uid})" filter="url(#ds${uid})"/>

      <!-- ===== غطاء المحرك ===== -->
      <path d="
        M42,16 Q60,6 82,12
        Q94,16 96,26 L96,38
        L36,38 L36,28
        Q36,20 42,16 Z"
        fill="${bodyLight}"/>
      <!-- لمعان الغطاء -->
      <path d="M48,14 Q64,8 78,14 L76,30 L44,32 Z"
        fill="white" opacity="0.25"/>

      <!-- ===== شريط LED أمامي ===== -->
      <path d="M40,10 Q60,2 86,10"
        stroke="${ledStrip}" stroke-width="4" fill="none"
        stroke-linecap="round" filter="url(#lg${uid})"
        opacity="${isOnline ? '1' : '0.3'}"/>
      ${isOnline ? `
      <path d="M44,11 Q60,4 84,11"
        stroke="white" stroke-width="1.5" fill="none"
        stroke-linecap="round" opacity="0.5"/>` : ''}

      <!-- ===== الزجاج الأمامي ===== -->
      <path d="
        M38,38 L96,38
        L92,56 Q86,60 66,60
        Q44,60 40,56 Z"
        fill="url(#gd${uid})"/>
      <!-- إطار أبيض -->
      <path d="
        M38,38 L96,38
        L92,56 Q86,60 66,60
        Q44,60 40,56 Z"
        fill="none" stroke="${bodyWhite}" stroke-width="2"/>
      <!-- انعكاس -->
      <path d="M44,40 L72,40 L70,54 Q58,56 48,54 Z"
        fill="white" opacity="0.08"/>

      <!-- ===== السقف ===== -->
      <path d="
        M42,60 L90,60
        L88,76 Q82,80 66,80
        Q48,80 44,76 Z"
        fill="${bodyLight}"/>
      <!-- لمعان السقف -->
      <path d="M46,61 L66,61 L66,76 Q56,78 46,75 Z"
        fill="white" opacity="0.15"/>

      <!-- ===== نافذة الجانب الأيمن ===== -->
      <path d="
        M96,40 L106,34
        L106,70 L100,80
        L92,84 L90,60 Z"
        fill="${glassDark}" opacity="0.6"/>
      <!-- فواصل -->
      <line x1="98" y1="50" x2="106" y2="46" stroke="${bodySide}" stroke-width="1.5" opacity="0.65"/>
      <line x1="96" y1="64" x2="104" y2="60" stroke="${bodySide}" stroke-width="1.5" opacity="0.65"/>
      <!-- مقبض باب -->
      <rect x="100" y="54" width="3.5" height="1.5" rx="0.75" fill="${bodySide}" opacity="0.8"/>

      <!-- ===== نافذة الجانب الأيسر (خفيفة) ===== -->
      <path d="M38,40 L26,34 L26,68 L32,78 L40,82 L40,60 Z"
        fill="${glassDark}" opacity="0.15"/>

      <!-- ===== الزجاج الخلفي ===== -->
      <path d="
        M46,76 L88,76
        L90,84 Q82,88 66,88
        Q50,88 44,84 Z"
        fill="url(#gd${uid})" opacity="0.5"/>
      <path d="
        M46,76 L88,76
        L90,84 Q82,88 66,88
        Q50,88 44,84 Z"
        fill="none" stroke="${bodyLight}" stroke-width="1"/>

      <!-- ===== المؤخرة ===== -->
      <path d="
        M44,86 Q52,92 66,94
        Q82,92 90,86
        L94,90 Q82,98 66,98
        Q50,98 38,90 Z"
        fill="${bodySide}"/>

      <!-- ===== العجلات ===== -->
      <!-- أمامي أيمن (كبير قريب) -->
      <ellipse cx="104" cy="34" rx="7" ry="5" fill="url(#wh${uid})"/>
      <ellipse cx="104" cy="34" rx="4" ry="2.8" fill="${wheelMid}"/>
      <circle cx="104" cy="34" r="1.5" fill="${wheelInner}"/>
      <!-- خلفي أيمن -->
      <ellipse cx="102" cy="80" rx="7" ry="5" fill="url(#wh${uid})"/>
      <ellipse cx="102" cy="80" rx="4" ry="2.8" fill="${wheelMid}"/>
      <circle cx="102" cy="80" r="1.5" fill="${wheelInner}"/>
      <!-- أمامي أيسر (أصغر بعيد) -->
      <ellipse cx="24" cy="30" rx="5.5" ry="4" fill="url(#wh${uid})"/>
      <ellipse cx="24" cy="30" rx="3" ry="2.2" fill="${wheelMid}"/>
      <circle cx="24" cy="30" r="1" fill="${wheelInner}"/>
      <!-- خلفي أيسر -->
      <ellipse cx="24" cy="76" rx="5.5" ry="4" fill="url(#wh${uid})"/>
      <ellipse cx="24" cy="76" rx="3" ry="2.2" fill="${wheelMid}"/>
      <circle cx="24" cy="76" r="1" fill="${wheelInner}"/>

      <!-- ===== المرايا ===== -->
      <ellipse cx="20" cy="40" rx="4" ry="2.2" fill="${mirrorDark}" stroke="${bodyMid}" stroke-width="0.5"/>
      <ellipse cx="110" cy="34" rx="4" ry="2.2" fill="${mirrorDark}" stroke="${bodyMid}" stroke-width="0.5"/>

      <!-- ===== إشارات خلفية ===== -->
      <circle cx="44" cy="90" r="2.5" fill="${rearLight}" opacity="0.9"/>
      <circle cx="90" cy="90" r="2.5" fill="${rearLight}" opacity="0.9"/>
      ${isOnline ? `
      <circle cx="44" cy="90" r="1" fill="white" opacity="0.5"/>
      <circle cx="90" cy="90" r="1" fill="white" opacity="0.5"/>` : ''}

      <!-- ===== لمعان ===== -->
      <path d="M50,10 Q64,4 80,10 L76,26 L48,28 Z"
        fill="white" opacity="0.12"/>

      ${isSelected ? `
      <ellipse cx="66" cy="56" rx="58" ry="48"
        fill="none" stroke="${accentColor}" stroke-width="1.5"
        opacity="0.35" stroke-dasharray="4,3"/>` : ''}
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
