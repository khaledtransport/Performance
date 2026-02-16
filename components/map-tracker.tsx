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

// أيقونة سيارة UberXL ثلاثية الأبعاد - ميني فان أبيض بزاوية isometric
const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  const rotation = heading != null && heading > 0 ? heading : 0;
  const scale = isSelected ? 1.15 : 1;
  const w = Math.round(48 * scale);
  const h = Math.round(48 * scale);
  
  // ألوان - أبيض نظيف مثل UberXL بالضبط
  const bodyColor = isOnline ? '#F5F5F5' : '#B0BEC5';
  const bodyShade = isOnline ? '#E0E0E0' : '#90A4AE';
  const bodyShadow = isOnline ? '#BDBDBD' : '#78909C';
  const bodyHighlight = isOnline ? '#FFFFFF' : '#CFD8DC';
  const glassColor = isOnline ? '#455A64' : '#78909C';
  const glassDark = isOnline ? '#263238' : '#607D8B';
  const glassHighlight = isOnline ? '#546E7A' : '#90A4AE';
  const wheelColor = '#212121';
  const ledColor = isOnline ? '#FFFFFF' : '#90A4AE';
  const rearLed = isOnline ? '#FF6D00' : '#90A4AE';
  const accentColor = isSelected ? '#1A73E8' : isOnline ? '#4CAF50' : '#9E9E9E';
  const shadowColor = isSelected ? 'rgba(26,115,232,0.4)' : isOnline ? 'rgba(76,175,80,0.2)' : 'rgba(0,0,0,0.08)';
  const glowSize = isSelected ? 24 : isOnline ? 14 : 0;
  const uid = `u${isOnline ? '1' : '0'}${isSelected ? 's' : 'n'}`;
  
  const svgCar = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${w}" height="${h}">
      <defs>
        <!-- تدرج الجسم - أبيض ثلاثي الأبعاد -->
        <linearGradient id="b${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bodyHighlight}"/>
          <stop offset="40%" stop-color="${bodyColor}"/>
          <stop offset="100%" stop-color="${bodyShade}"/>
        </linearGradient>
        <!-- تدرج السقف -->
        <linearGradient id="r${uid}" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="${bodyHighlight}"/>
          <stop offset="50%" stop-color="${bodyColor}"/>
          <stop offset="100%" stop-color="${bodyShadow}"/>
        </linearGradient>
        <!-- تدرج الزجاج -->
        <linearGradient id="g${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${glassHighlight}"/>
          <stop offset="50%" stop-color="${glassColor}"/>
          <stop offset="100%" stop-color="${glassDark}"/>
        </linearGradient>
        <!-- لمعان -->
        <linearGradient id="h${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="white" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
        <!-- ظل -->
        <filter id="d${uid}">
          <feDropShadow dx="2" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.25)"/>
        </filter>
        <filter id="gw${uid}">
          <feGaussianBlur stdDeviation="0.5"/>
        </filter>
      </defs>
      
      <!-- ظل السيارة على الأرض -->
      <ellipse cx="26" cy="44" rx="16" ry="4" fill="rgba(0,0,0,0.1)"/>
      
      <!-- ===== الجسم الرئيسي - isometric 3D ===== -->
      <!-- الجانب السفلي (الظل) -->
      <path d="M8,28 C8,28 6,18 8,12 C10,6 14,4 24,4 C34,4 38,6 40,12 C42,18 40,28 40,28 L40,36 C40,40 38,42 24,42 C10,42 8,40 8,36 Z" 
        fill="${bodyShadow}" filter="url(#d${uid})"/>
      
      <!-- الجسم الرئيسي -->
      <path d="M9,27 C9,27 7,18 9,12 C11,7 15,5 24,5 C33,5 37,7 39,12 C41,18 39,27 39,27 L39,35 C39,38.5 37,40 24,40 C11,40 9,38.5 9,35 Z" 
        fill="url(#b${uid})"/>
      
      <!-- حافة الجسم -->
      <path d="M9,27 C9,27 7,18 9,12 C11,7 15,5 24,5 C33,5 37,7 39,12 C41,18 39,27 39,27 L39,35 C39,38.5 37,40 24,40 C11,40 9,38.5 9,35 Z" 
        fill="none" stroke="${bodyShadow}" stroke-width="0.4" opacity="0.5"/>

      <!-- ===== غطاء المحرك الأمامي - منحني مثل UberXL ===== -->
      <path d="M12,12 C14,7.5 17,6 24,6 C31,6 34,7.5 36,12 L36,16 L12,16 Z" 
        fill="url(#r${uid})"/>
      <!-- لمعان الغطاء الأمامي -->
      <path d="M14,9 C16,7 20,6.5 24,6.5 C26,6.5 28,7 30,8 L28,13 L16,13 Z" 
        fill="white" opacity="0.2"/>

      <!-- ===== الزجاج الأمامي ===== -->
      <path d="M13,16 L35,16 L33,23 C32,24 29,25 24,25 C19,25 16,24 15,23 Z" 
        fill="url(#g${uid})"/>
      <!-- انعكاس الزجاج الأمامي -->
      <path d="M15,17 L25,17 L24,22 C23,22.5 21,23 19,22.5 L17,22 Z" 
        fill="white" opacity="0.12"/>
      <!-- إطار الزجاج -->
      <path d="M13,16 L35,16 L33,23 C32,24 29,25 24,25 C19,25 16,24 15,23 Z" 
        fill="none" stroke="${bodyColor}" stroke-width="1"/>
      
      <!-- ===== سقف السيارة ===== -->
      <path d="M14,25 L34,25 L34,33 C34,34 31,35 24,35 C17,35 14,34 14,33 Z" 
        fill="url(#r${uid})"/>
      <!-- لمعان السقف ثلاثي الأبعاد -->
      <path d="M16,26 L24,26 L24,33 C22,33.5 18,33 16,32 Z" 
        fill="url(#h${uid})"/>

      <!-- ===== النوافذ الجانبية ===== -->
      <!-- جانب يسار -->
      <path d="M12,17 L14,25 L14,33 L11,30 L10,20 Z" 
        fill="${glassDark}" opacity="0.75"/>
      <!-- جانب يمين -->
      <path d="M36,17 L34,25 L34,33 L37,30 L38,20 Z" 
        fill="${glassDark}" opacity="0.6"/>
      
      <!-- فواصل النوافذ الجانبية -->
      <line x1="12.5" y1="22" x2="14" y2="29" stroke="${bodyColor}" stroke-width="0.8"/>
      <line x1="35.5" y1="22" x2="34" y2="29" stroke="${bodyColor}" stroke-width="0.8"/>

      <!-- ===== الزجاج الخلفي ===== -->
      <path d="M15,33 L33,33 L35,36 C34,37 30,38 24,38 C18,38 14,37 13,36 Z" 
        fill="url(#g${uid})" opacity="0.7"/>
      <!-- إطار الزجاج الخلفي -->
      <path d="M15,33 L33,33 L35,36 C34,37 30,38 24,38 C18,38 14,37 13,36 Z" 
        fill="none" stroke="${bodyColor}" stroke-width="0.8"/>

      <!-- ===== المؤخرة ===== -->
      <path d="M13,36 C14,38 18,40 24,40 C30,40 34,38 35,36 L36,38 C35,40 30,41 24,41 C18,41 13,40 12,38 Z" 
        fill="${bodyShade}"/>

      <!-- ===== العجلات - دوائر سوداء واقعية ===== -->
      <!-- أمامي يسار -->
      <ellipse cx="11" cy="17" rx="3" ry="2.2" fill="${wheelColor}"/>
      <ellipse cx="11" cy="17" rx="1.8" ry="1.3" fill="#333"/>
      <ellipse cx="11" cy="17" rx="0.8" ry="0.6" fill="#555"/>
      <!-- أمامي يمين -->
      <ellipse cx="37" cy="17" rx="3" ry="2.2" fill="${wheelColor}"/>
      <ellipse cx="37" cy="17" rx="1.8" ry="1.3" fill="#333"/>
      <ellipse cx="37" cy="17" rx="0.8" ry="0.6" fill="#555"/>
      <!-- خلفي يسار -->
      <ellipse cx="11" cy="34" rx="3" ry="2.2" fill="${wheelColor}"/>
      <ellipse cx="11" cy="34" rx="1.8" ry="1.3" fill="#333"/>
      <ellipse cx="11" cy="34" rx="0.8" ry="0.6" fill="#555"/>
      <!-- خلفي يمين -->
      <ellipse cx="37" cy="34" rx="3" ry="2.2" fill="${wheelColor}"/>
      <ellipse cx="37" cy="34" rx="1.8" ry="1.3" fill="#333"/>
      <ellipse cx="37" cy="34" rx="0.8" ry="0.6" fill="#555"/>

      <!-- ===== الأنوار الأمامية - شريط LED أبيض ===== -->
      <path d="M14,10 C17,9 21,8.5 24,8.5 C27,8.5 31,9 34,10" 
        stroke="${ledColor}" stroke-width="1.8" fill="none" stroke-linecap="round" filter="url(#gw${uid})" opacity="${isOnline ? '1' : '0.4'}"/>
      ${isOnline ? `
        <path d="M15,10.5 C18,9.5 21,9 24,9 C27,9 30,9.5 33,10.5" 
          stroke="white" stroke-width="0.6" fill="none" stroke-linecap="round" opacity="0.5"/>
      ` : ''}

      <!-- ===== الأنوار الخلفية - برتقالي ===== -->
      <circle cx="14" cy="39" r="1.2" fill="${rearLed}" opacity="0.9"/>
      <circle cx="34" cy="39" r="1.2" fill="${rearLed}" opacity="0.9"/>
      ${isOnline ? `
        <circle cx="14" cy="39" r="0.6" fill="white" opacity="0.6"/>
        <circle cx="34" cy="39" r="0.6" fill="white" opacity="0.6"/>
      ` : ''}

      <!-- ===== المرايا الجانبية ===== -->
      <ellipse cx="9" cy="18" rx="1.5" ry="1" fill="${bodyShade}" stroke="${bodyShadow}" stroke-width="0.3"/>
      <ellipse cx="39" cy="18" rx="1.5" ry="1" fill="${bodyColor}" stroke="${bodyShadow}" stroke-width="0.3"/>

      <!-- ===== لمعان ثلاثي الأبعاد على الجسم ===== -->
      <path d="M16,7 C18,6 22,5.5 24,5.5 C25,5.5 26,5.5 27,6 L26,11 L18,11 Z" 
        fill="white" opacity="0.15"/>
      <!-- لمعان الجانب -->
      <path d="M10,14 L11,24 L10,30 L9,22 Z" fill="white" opacity="0.06"/>

      ${isSelected ? `
        <ellipse cx="24" cy="24" rx="24" ry="22" fill="none" stroke="${accentColor}" stroke-width="1.2" opacity="0.35" stroke-dasharray="3,2.5"/>
      ` : ''}
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
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
        ">
          <img src="data:image/svg+xml,${encodedSvg}" width="${w}" height="${h}" style="display:block;" />
        </div>
        ${busNumber ? `
        <div style="
          position: absolute;
          bottom: ${glowSize - 12}px;
          left: 50%;
          transform: translateX(-50%);
          background: ${isOnline ? 'rgba(255,255,255,0.95)' : 'rgba(176,190,197,0.9)'};
          color: ${isOnline ? '#1A1A2E' : '#546E7A'};
          font-size: 9px;
          font-weight: 800;
          padding: 1.5px 7px;
          border-radius: 8px;
          white-space: nowrap;
          z-index: 20;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border: 1px solid ${isOnline ? '#E0E0E0' : '#B0BEC5'};
          letter-spacing: 0.3px;
        ">${busNumber}</div>` : ''}
      </div>
      <style>
        @keyframes busGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.08); }
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
