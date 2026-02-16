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

// أيقونة ميني فان UberXL — منظور 3D isometric (3/4 أمامي علوي)
const createBusIcon = (isOnline: boolean, isSelected: boolean, heading?: number | null, busNumber?: string) => {
  const rotation = heading != null && heading > 0 ? heading : 0;
  const scale = isSelected ? 1.15 : 1;
  const w = Math.round(64 * scale);
  const h = Math.round(52 * scale);
  
  // ألوان — أبيض ثلاثي الأبعاد
  const bodyWhite   = isOnline ? '#FFFFFF' : '#B8C4CC';
  const bodyLight   = isOnline ? '#F2F2F2' : '#A8B8C2';
  const bodyMid     = isOnline ? '#E6E6E6' : '#96A8B4';
  const bodySide    = isOnline ? '#D4D4D4' : '#889AA6';
  const bodyBottom  = isOnline ? '#C0C0C0' : '#7A8E9A';
  const glassLight  = isOnline ? '#4A4A4A' : '#7A8A94';
  const glassDark   = isOnline ? '#1F1F1F' : '#5A6A74';
  const wheelOuter  = '#111111';
  const wheelMid    = '#222222';
  const wheelInner  = '#444444';
  const ledStrip    = isOnline ? '#FFFFFF' : '#9E9E9E';
  const rearLight   = isOnline ? '#FF7700' : '#90A4AE';
  const mirrorDark  = isOnline ? '#2A2A2A' : '#5A6A74';
  const accentColor = isSelected ? '#1A73E8' : isOnline ? '#4CAF50' : '#9E9E9E';
  const shadowColor = isSelected ? 'rgba(26,115,232,0.35)' : isOnline ? 'rgba(76,175,80,0.18)' : 'rgba(0,0,0,0.05)';
  const glowSize    = isSelected ? 20 : isOnline ? 10 : 0;
  const uid = `m${isOnline ? '1' : '0'}${isSelected ? 's' : 'n'}`;
  
  const svgCar = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 140" width="${w}" height="${h}">
      <defs>
        <linearGradient id="bd${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bodyWhite}"/>
          <stop offset="100%" stop-color="${bodyMid}"/>
        </linearGradient>
        <linearGradient id="sd${uid}" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="${bodySide}"/>
          <stop offset="100%" stop-color="${bodyBottom}"/>
        </linearGradient>
        <linearGradient id="gd${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${glassLight}"/>
          <stop offset="100%" stop-color="${glassDark}"/>
        </linearGradient>
        <linearGradient id="tp${uid}" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stop-color="${bodyWhite}"/>
          <stop offset="100%" stop-color="${bodyLight}"/>
        </linearGradient>
        <linearGradient id="hl${uid}" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="wh${uid}">
          <stop offset="0%" stop-color="${wheelInner}"/>
          <stop offset="60%" stop-color="${wheelMid}"/>
          <stop offset="100%" stop-color="${wheelOuter}"/>
        </radialGradient>
        <filter id="ds${uid}" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.2)"/>
        </filter>
        <filter id="gl${uid}">
          <feGaussianBlur stdDeviation="1"/>
        </filter>
      </defs>

      <!-- ===== ظل الأرض ===== -->
      <ellipse cx="95" cy="132" rx="55" ry="7" fill="rgba(0,0,0,0.08)"/>

      <!-- ===== الجسم السفلي / الجانب الأيمن (العمق 3D) ===== -->
      <path d="
        M42,75 Q42,90 55,100
        L145,105 Q155,100 158,90
        L160,70 Q158,60 150,55
        L145,100 Q130,108 80,108
        Q50,105 42,95 Z"
        fill="url(#sd${uid})" opacity="0.8"/>

      <!-- ===== قاع السيارة (شريط سفلي) ===== -->
      <path d="
        M50,100 Q80,112 130,108
        L148,104 Q155,98 156,88
        L158,92 Q156,104 148,110
        Q130,116 80,114
        Q50,112 42,100 Z"
        fill="${bodyBottom}" opacity="0.5"/>

      <!-- ===== الجسم الرئيسي العلوي ===== -->
      <path d="
        M50,78 Q42,68 42,55
        Q42,35 55,24
        L110,18 Q130,18 145,28
        Q155,38 155,55
        L155,75 Q150,90 135,98
        L75,100 Q55,95 50,78 Z"
        fill="url(#bd${uid})" filter="url(#ds${uid})"/>
      <!-- حافة خفيفة -->
      <path d="
        M50,78 Q42,68 42,55
        Q42,35 55,24
        L110,18 Q130,18 145,28
        Q155,38 155,55
        L155,75 Q150,90 135,98
        L75,100 Q55,95 50,78 Z"
        fill="none" stroke="${bodyMid}" stroke-width="0.4" opacity="0.5"/>

      <!-- ===== غطاء المحرك الأمامي (الكبنة) ===== -->
      <path d="
        M65,28 Q90,16 125,22
        Q140,26 148,35
        L148,50 L56,50
        L56,42 Q56,32 65,28 Z"
        fill="url(#tp${uid})"/>
      <!-- لمعان الغطاء -->
      <path d="M72,26 Q95,18 120,24 L115,40 L68,42 Z"
        fill="white" opacity="0.18"/>

      <!-- ===== شريط LED الأمامي الرفيع ===== -->
      <path d="M62,24 Q90,14 132,22"
        stroke="${ledStrip}" stroke-width="3" fill="none"
        stroke-linecap="round" filter="url(#gl${uid})"
        opacity="${isOnline ? '1' : '0.3'}"/>
      ${isOnline ? `
      <path d="M65,25 Q90,16 130,23"
        stroke="white" stroke-width="1" fill="none"
        stroke-linecap="round" opacity="0.45"/>` : ''}

      <!-- ===== الزجاج الأمامي (كبير منحني) ===== -->
      <path d="
        M56,50 L148,50
        L142,72 Q135,76 100,76
        Q68,76 60,72 Z"
        fill="url(#gd${uid})"/>
      <!-- إطار الزجاج الأبيض -->
      <path d="
        M56,50 L148,50
        L142,72 Q135,76 100,76
        Q68,76 60,72 Z"
        fill="none" stroke="${bodyWhite}" stroke-width="1.5"/>
      <!-- انعكاس الزجاج الأمامي -->
      <path d="M64,52 L105,52 L102,70 Q88,72 72,70 Z"
        fill="white" opacity="0.07"/>

      <!-- ===== السقف ===== -->
      <path d="
        M62,76 L138,76
        L138,94 Q130,98 100,98
        Q72,98 62,94 Z"
        fill="url(#tp${uid})"/>
      <!-- لمعان السقف -->
      <path d="M66,77 L100,77 L100,94 Q85,96 66,93 Z"
        fill="url(#hl${uid})"/>

      <!-- ===== النافذة الجانبية اليمنى (على الجدار) ===== -->
      <path d="
        M148,52 L160,48
        L160,82 L152,92
        L142,96 L140,76 Z"
        fill="${glassDark}" opacity="0.55"/>
      <!-- فاصل نافذة أول -->
      <line x1="150" y1="62" x2="160" y2="60" stroke="${bodySide}" stroke-width="1" opacity="0.6"/>
      <!-- فاصل نافذة ثاني -->
      <line x1="148" y1="76" x2="158" y2="74" stroke="${bodySide}" stroke-width="1" opacity="0.6"/>
      <!-- مقابض الأبواب -->
      <rect x="152" y="66" width="4" height="1.2" rx="0.6" fill="${bodySide}" opacity="0.7"/>
      <rect x="150" y="80" width="4" height="1.2" rx="0.6" fill="${bodySide}" opacity="0.7"/>

      <!-- ===== نافذة جانب أيسر (خفيفة) ===== -->
      <path d="M56,52 L44,48 L44,80 L50,90 L60,94 L60,76 Z"
        fill="${glassDark}" opacity="0.18"/>

      <!-- ===== الزجاج الخلفي ===== -->
      <path d="
        M68,94 L136,94
        L140,102 Q130,106 100,106
        Q72,106 64,102 Z"
        fill="url(#gd${uid})" opacity="0.5"/>
      <path d="
        M68,94 L136,94
        L140,102 Q130,106 100,106
        Q72,106 64,102 Z"
        fill="none" stroke="${bodyLight}" stroke-width="0.8"/>

      <!-- ===== المؤخرة السفلية ===== -->
      <path d="
        M64,104 Q72,110 100,112
        Q130,110 140,104
        L144,108 Q130,116 100,118
        Q72,116 58,108 Z"
        fill="${bodySide}"/>

      <!-- ===== العجلات — دوائر واقعية ===== -->
      <!-- أمامي أيمن (كبير - أقرب) -->
      <ellipse cx="158" cy="50" rx="8" ry="5.5" fill="url(#wh${uid})"/>
      <ellipse cx="158" cy="50" rx="4.5" ry="3" fill="${wheelMid}"/>
      <circle cx="158" cy="50" r="1.5" fill="${wheelInner}"/>
      <!-- خلفي أيمن -->
      <ellipse cx="156" cy="96" rx="8" ry="5.5" fill="url(#wh${uid})"/>
      <ellipse cx="156" cy="96" rx="4.5" ry="3" fill="${wheelMid}"/>
      <circle cx="156" cy="96" r="1.5" fill="${wheelInner}"/>
      <!-- أمامي أيسر (أصغر - أبعد) -->
      <ellipse cx="42" cy="46" rx="6.5" ry="4.5" fill="url(#wh${uid})"/>
      <ellipse cx="42" cy="46" rx="3.5" ry="2.5" fill="${wheelMid}"/>
      <circle cx="42" cy="46" r="1.2" fill="${wheelInner}"/>
      <!-- خلفي أيسر -->
      <ellipse cx="42" cy="92" rx="6.5" ry="4.5" fill="url(#wh${uid})"/>
      <ellipse cx="42" cy="92" rx="3.5" ry="2.5" fill="${wheelMid}"/>
      <circle cx="42" cy="92" r="1.2" fill="${wheelInner}"/>

      <!-- ===== المرايا الجانبية ===== -->
      <ellipse cx="38" cy="52" rx="3.5" ry="2" fill="${mirrorDark}" stroke="${bodyMid}" stroke-width="0.3"/>
      <ellipse cx="162" cy="48" rx="3.5" ry="2" fill="${mirrorDark}" stroke="${bodyMid}" stroke-width="0.3"/>

      <!-- ===== الإشارة الخلفية (برتقالي — أعلى يسار) ===== -->
      <circle cx="62" cy="106" r="2.2" fill="${rearLight}" opacity="0.9"/>
      ${isOnline ? `<circle cx="62" cy="106" r="1" fill="white" opacity="0.5"/>` : ''}
      <circle cx="140" cy="106" r="2.2" fill="${rearLight}" opacity="0.9"/>
      ${isOnline ? `<circle cx="140" cy="106" r="1" fill="white" opacity="0.5"/>` : ''}

      <!-- ===== لمعان ثلاثي الأبعاد على الجسم ===== -->
      <path d="M70,20 Q95,14 125,20 L120,36 L72,38 Z"
        fill="white" opacity="0.12"/>
      <path d="M46,40 L44,55 L44,70 L46,78 L50,68 L50,48 Z"
        fill="white" opacity="0.04"/>

      ${isSelected ? `
      <ellipse cx="100" cy="72" rx="88" ry="66"
        fill="none" stroke="${accentColor}" stroke-width="1.5"
        opacity="0.3" stroke-dasharray="4,3"/>` : ''}
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
