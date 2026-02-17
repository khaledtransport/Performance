/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: "/Performance",
  output: "standalone",
  eslint: {
    // Tailwind v4 class names differ from v3 — lint warnings don’t block build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // فحص TypeScript مفعّل — الأخطاء توقف البناء
    ignoreBuildErrors: false,
  },
  // تحسين الصور
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 ساعة
  },
  // تحسين الحزمة
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizeCss: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      // كاش طويل للملفات الثابتة (JS/CSS/صور)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // الأيقونات — كاش طويل (أسبوع) لأنها نادراً ما تتغير
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, immutable' },
        ],
      },
      // كاش قصير لـ API التتبع (بيانات حية)
      {
        source: '/api/tracking',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      // كاش متوسط لباقي API
      {
        source: '/api/:path((?!tracking|auth).*)',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=10, stale-while-revalidate=30' },
        ],
      },
      // manifest و SW
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/Performance/' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
