# 🔍 Comprehensive Project Audit Report

**Project**: University Transport System  
**Stack**: Next.js 16.1.6 · React 19.2.4 · Prisma 7.4.2 · Tailwind 4.2.1 · Zod 4.3.6  
**Date**: June 2025  
**Auditor**: GitHub Copilot (Claude Opus 4.6)

---

## Executive Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🐛 Errors & Bugs | 3 | 5 | 4 | 2 | **14** |
| 🔒 Security Issues | 4 | 3 | 2 | 1 | **10** |
| ⚡ Performance | 1 | 4 | 5 | 3 | **13** |
| ⚠️ Deprecated Patterns | 0 | 2 | 4 | 3 | **9** |
| 🚀 Modern Features Not Used | 0 | 2 | 5 | 4 | **11** |
| **Total** | **8** | **16** | **20** | **13** | **57** |

---

## 🐛 1. ERRORS & BUGS

| # | File | Line | Issue | Fix | Priority |
|---|------|------|-------|-----|----------|
| B1 | `proxy.ts` | 35 | **CRITICAL — Middleware NOT ACTIVE.** File exports `proxy()` instead of `middleware()` and the file is named `proxy.ts` not `middleware.ts`. Next.js requires the file to be at the project root named `middleware.ts` exporting a function named `middleware`. **All rate limiting, auth guards, and role-based routing defined here are COMPLETELY INACTIVE.** | Rename file to `middleware.ts` and rename `export async function proxy(...)` → `export async function middleware(...)` | 🔴 CRITICAL |
| B2 | `app/api/auth/register/route.ts` | 73-80 | **BUG — Admin session hijacked after creating a user.** After creating a new user, the code calls `setAuthCookie(token)` which sets the admin's browser cookie to the **new user's JWT token**. The admin loses their own session and is now logged in as the newly-created user. | Remove lines 73-80 (`const token = await signJWT(...)` and `await setAuthCookie(token)`). Return the new user data without setting any auth cookie. | 🔴 CRITICAL |
| B3 | `lib/query-cache.ts` | 23-27 | **BUG — Timer leak.** When a cache key is overwritten (set again before expiry), the previous `setTimeout` is never cleared. This causes: 1) memory leak from accumulated timers, 2) premature cache invalidation of the new entry. | Store the timer ID per key: `this.timers.set(key, setTimeout(...))` and clear any existing timer with `clearTimeout(this.timers.get(key))` before setting a new one. | 🔴 HIGH |
| B4 | `lib/web-push.ts` | 72-88 | **BUG — Race condition in push counters.** `sent` and `failed` variables are incremented inside `Promise.allSettled` callbacks, but the module-level `let sent = 0` / `let failed = 0` can be shared across concurrent requests in serverless cold-start scenarios. | Move `sent`/`failed` declarations inside the function scope, or use `results.filter(r => r.status === 'fulfilled').length` after `allSettled` completes. | 🟡 MEDIUM |
| B5 | `lib/cache.ts` | 11-13 | **BUG — setInterval in module scope** creates memory leaks in serverless. Each cold start creates a new interval that never stops. Over time, multiple cleanup intervals accumulate. | Use lazy cleanup: check/delete expired entries only when `get()` is called, or use `WeakRef`/`FinalizationRegistry`. Remove the `setInterval`. | 🟡 MEDIUM |
| B6 | `app/api/tracking/route.ts` | 1-572 | **BUG — Raw SQL uses `$queryRawUnsafe` patterns.** The `DISTINCT ON` query is safe (no user input interpolation), but `getBusLocations()` is duplicated in `tracking/stream/route.ts` with identical logic — any bug fix must be applied in two places. | Extract `getBusLocations()` into a shared `lib/tracking.ts` module and import it in both routes. | 🟡 MEDIUM |
| B7 | `app/api/statistics/route.ts` | ~60-120 | **BUG — Redundant data fetching.** Fetches ALL trips with `findMany` (lines ~60-70) AND separately runs `groupBy` aggregations on the same trip data. The full trip results are only used to count statuses — which the `groupBy` already provides. | Remove the full `findMany` query; use only `groupBy` results for status counts. Or use a single raw SQL query with window functions. | 🟡 MEDIUM |
| B8 | `components/notification-center.tsx` | ~50-100 | **BUG — Audio autoplay blocked.** Creates `new Audio()` objects on component mount. Most browsers block autoplay of audio without user interaction. The notification sound will silently fail. | Initialize audio on first user interaction (click/tap handler), or use the Web Audio API with a user-gesture gate. | 🟢 LOW |
| B9 | `app/api/driver/my-bus/route.ts` | ~80-120 | **BUG — Name-based driver matching is fragile.** Falls back to matching driver by `name` string if no direct `Bus.driverId` link exists. Any name variation (spacing, typo, Arabic diacritics) causes a mismatch. | Always use `driverId` foreign key. Add a migration to ensure all buses have proper `driverId` set. Remove name-matching fallback. | 🟡 MEDIUM |
| B10 | `app/api/buses/route.ts` | ~90 | **BUG — `catch (error: any)`** loses type safety. The `any` type means no compile-time checks on error properties. Present in 15+ API routes. | Use `catch (error: unknown)` and narrow with `error instanceof Error ? error.message : 'Unknown error'`. | 🟢 LOW |
| B11 | `tsconfig.json` | 5 | **CONFIG — `jsx: "react-jsx"` is wrong for Next.js.** Next.js expects `"preserve"` because it handles JSX transformation via SWC. Using `"react-jsx"` can cause double-compilation. | Change `"jsx": "react-jsx"` → `"jsx": "preserve"` | 🔴 HIGH |
| B12 | `prisma/schema.prisma` | ~190-210 | **DEAD CODE — `BusLocation` model still in schema** but the tracking POST route writes to `bus_tracking` (via raw SQL), not `BusLocation`. The model generates unused Prisma client code and a dead table. | Remove the `BusLocation` model and create a migration to drop the table if not needed. | 🟢 LOW |
| B13 | `app/api/trips/route.ts` | ~100-200 | **BUG — Dual table query merging.** Queries both `trip` and `route_trip` tables, then merges them in-memory by checking for duplicate `routeId+date+period` combos. This is fragile — if the same trip exists in both tables with slight field differences, results are unpredictable. | Migrate to a single canonical `trip` table. Or add a DB-level unique constraint and upsert logic. | 🔴 HIGH |
| B14 | `app/page.tsx` | ~1-50 | **BUG — Home page is "use client" but only does a redirect.** React 19 `useEffect` + `router.push` causes a flash of empty content before redirecting. | Convert to a Server Component using `redirect()` from `next/navigation`, or use `middleware.ts` to redirect `/` → `/dashboard`. | 🟡 MEDIUM |

---

## 🔒 2. SECURITY ISSUES

| # | File | Line | Issue | Fix | Priority |
|---|------|------|-------|-----|----------|
| S1 | `proxy.ts` | ALL | **CRITICAL — Middleware is NOT running** (see B1). All auth guards, rate limiting, CSRF protection, and role-based access control defined in this file are **completely bypassed**. Every API route is publicly accessible. | Rename to `middleware.ts`, rename function to `middleware()`. | 🔴 CRITICAL |
| S2 | `lib/supabase-server.ts` | 8-14 | **CRITICAL — Uses `SERVICE_ROLE_KEY` by default.** The comment says "temporarily" but this has been shipped. The service role key **bypasses all Row-Level Security** in Supabase. Any code using this client can read/write ALL data. | Use `SUPABASE_ANON_KEY` for the default client. Create a separate `supabaseAdmin` client with the service role key only for operations that truly need elevated access. | 🔴 CRITICAL |
| S3 | `app/api/admin/drivers-users/route.ts` | 1-33 | **HIGH — No authentication check at all.** This endpoint returns a list of all drivers/users without any auth verification. Anyone can call `GET /api/admin/drivers-users` and get user data. | Add `const user = await getCurrentUser(); if (!user \|\| !['ADMIN','MANAGER'].includes(user.role)) return NextResponse.json({error:'Unauthorized'}, {status:403})` | 🔴 HIGH |
| S4 | `app/api/buses/route.ts` | POST handler | **HIGH — No auth on mutations.** The POST handler (create bus) has no authentication check. Same pattern in `districts`, `drivers`, `routes`, `universities`, `representatives` POST handlers. | Add auth verification to ALL POST/PUT/DELETE handlers. Consider a shared `withAuth()` wrapper HOF. | 🔴 HIGH |
| S5 | `lib/jwt-config.ts` | 7-10 | **MEDIUM — Weak dev secret fallback.** In development, falls back to `"development-secret-key-change-in-production"`. If `JWT_SECRET` env var is accidentally unset in production, this weak key would be used. | Throw an error if `JWT_SECRET` is not set in production: `if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET required')` | 🟡 MEDIUM |
| S6 | `next.config.js` | headers | **MEDIUM — Missing Content-Security-Policy.** Has X-Frame-Options, X-Content-Type-Options, and Referrer-Policy, but no CSP header. This leaves the app vulnerable to XSS via inline scripts. | Add `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co` | 🟡 MEDIUM |
| S7 | `app/api/auth/login/route.ts` | 40-50 | **LOW — Timing attack on user lookup.** Returns different response times for "user not found" vs "wrong password" (bcrypt compare only runs if user exists). An attacker can enumerate valid usernames. | Always run `bcrypt.compare()` against a dummy hash when user is not found: `const dummy = '$2a$10$...'; await bcrypt.compare(password, user?.password \|\| dummy)` | 🟡 MEDIUM |
| S8 | `app/api/tracking/route.ts` | POST ~200 | **MEDIUM — No input size limit on tracking POST.** The location update endpoint accepts any payload size. A malicious client could send oversized payloads. | Add `Content-Length` check or use Next.js `bodyParser: { sizeLimit: '1kb' }` in route config. Validate that lat/lng are valid numbers in range. | 🟡 MEDIUM |
| S9 | `app/api/push/subscribe/route.ts` | 1-82 | **LOW — Push subscription endpoint only validates auth**, doesn't validate the subscription object shape. A malicious user could store arbitrary JSON as a push subscription. | Add Zod validation for the subscription: `z.object({ endpoint: z.url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) })` | 🟢 LOW |
| S10 | `app/api/import/excel/route.ts` | 1-173 | **HIGH — No file type validation.** Accepts any uploaded file without checking MIME type or file extension. Malicious files could be processed. | Validate `file.type` is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `.xlsx`/`.xls`. Add file size limit. | 🔴 HIGH |

---

## ⚡ 3. PERFORMANCE IMPROVEMENTS

| # | File | Line | Issue | Fix | Priority |
|---|------|------|-------|-----|----------|
| P1 | `app/api/import/excel/route.ts` | 70-150 | **CRITICAL — N+1 queries in loop.** For each row in the Excel file, runs `findFirst` + `create/update` individually. Importing 100 rows = 200+ DB queries. | Use `createMany()` or `upsert` in a transaction. Batch rows: `await prisma.$transaction(rows.map(r => prisma.bus.upsert({...})))`. Or use `createManyAndReturn` (Prisma 7). | 🔴 CRITICAL |
| P2 | `components/notification-center.tsx` | ~100 | **HIGH — 5-second polling interval.** Every connected client polls `GET /api/notifications` every 5 seconds. With 100 users = 20 requests/second to the DB. | Use Server-Sent Events (SSE) or WebSocket for real-time notifications. Or increase interval to 30-60 seconds. You already have SSE infrastructure in `tracking/stream`. | 🔴 HIGH |
| P3 | `app/api/trips/route.ts` | 100-250 | **HIGH — Two separate queries merged in JS.** Fetches from `trip` table AND `route_trip` table separately, deduplicates with `Map` in JavaScript. Both queries fetch full records with includes. | Consolidate into a single query with a SQL UNION, or migrate to one table. At minimum, use `select` to fetch only needed fields. | 🔴 HIGH |
| P4 | `app/api/statistics/route.ts` | 50-150 | **HIGH — 10 parallel Prisma queries.** Runs `Promise.all` with 10 separate count/findMany/groupBy queries. Many overlap (e.g., trip counts + trip groupBy). | Consolidate into 2-3 queries using raw SQL with CTEs, or use `groupBy` with conditional counts: `count({ where: { status: 'ACTIVE' } })`. | 🔴 HIGH |
| P5 | `app/dashboard/page.tsx` | 1-578 | **HIGH — No data caching, no SWR.** This 578-line "use client" page uses raw `fetch` in `useEffect` with no caching, deduplication, or revalidation. The hooks `useStatistics`, `useTrips`, `useTripsRange` already exist in `lib/hooks/` but are NOT used here. | Replace manual fetch calls with the existing SWR hooks: `useStatistics()`, `useTrips()`, `useTripsRange()`. | 🔴 HIGH |
| P6 | `app/api/driver/dashboard/route.ts` | 30-80 | **MEDIUM — Deep nested includes.** Fetches driver → bus → districts → routes → trips with all fields. Most of this data is unused by the driver dashboard UI. | Use `select` instead of `include` to fetch only the fields displayed. Add `take` limits on nested collections. | 🟡 MEDIUM |
| P7 | `lib/cache.ts` + `lib/query-cache.ts` | ALL | **MEDIUM — Two redundant in-memory cache systems.** `SimpleCache` and `QueryCache` have overlapping functionality. Both are in-memory (lost on every serverless cold start), and both leak memory (see B3, B5). | Consolidate into one cache class. For production, use Redis (you already have Upstash Redis for rate limiting) or Next.js `unstable_cache` / `revalidateTag`. | 🟡 MEDIUM |
| P8 | `app/api/tracking/route.ts` | GET handler | **MEDIUM — Raw SQL for bus locations.** Uses `$queryRaw` with `DISTINCT ON` which is fine, but the result is then transformed in JS with `map`. The SQL could return the transformed shape directly. | Add column aliases in SQL to match the desired response shape, eliminating the JS `map`. | 🟡 MEDIUM |
| P9 | `app/api/tracking/stream/route.ts` | 50-80 | **MEDIUM — SSE duplicates query logic.** The SSE stream has a copy-pasted `getBusLocations()` that is identical to the one in `tracking/route.ts`. | Extract into shared module (see B6). Also, the 2-second poll in SSE is aggressive — consider 5-10 seconds for bus tracking. | 🟡 MEDIUM |
| P10 | ALL `"use client"` pages | - | **MEDIUM — No code splitting.** Every page is a single "use client" bundle. Heavy components (map, charts, notification center) are not lazy-loaded. | Use `React.lazy()` and `dynamic()` from `next/dynamic` with `{ ssr: false }` for heavy components like MapTracker, Recharts, and NotificationCenter. | 🟡 MEDIUM |
| P11 | `prisma/schema.prisma` | varies | **LOW — Missing composite indexes.** Queries filter on `(routeId, date)`, `(busId, timestamp)`, `(userId, isRead)` but only single-column indexes exist. | Add composite indexes: `@@index([routeId, date])` on Trip, `@@index([busId, timestamp])` on bus_tracking, `@@index([userId, isRead])` on Notification. | 🟢 LOW |
| P12 | `app/api/notifications/route.ts` | GET | **LOW — Fetches ALL notifications for a user.** No pagination. A user with 1000 notifications gets all 1000 returned. | Add `take: 50` limit and cursor-based pagination. | 🟢 LOW |
| P13 | `app/api/universities/route.ts` | GET | **LOW — N+1 on route count.** Fetches all universities, then for each one includes `_count: { routes }`. With many universities, this is efficient via Prisma's batching, but could still be a single `GROUP BY` in SQL. | Already using `_count` (which Prisma batches), so this is acceptable. Minor: add `select` to limit returned fields. | 🟢 LOW |

---

## ⚠️ 4. DEPRECATED PATTERNS

| # | File | Line | Issue | Fix | Priority |
|---|------|------|-------|-----|----------|
| D1 | ALL pages | - | **HIGH — All pages use "use client" with no Server Components.** Next.js 13+ (and especially 16) is built around React Server Components (RSC) as the default. Running everything as client components defeats the purpose — larger bundles, no streaming, no server-side data fetching. | Convert data-fetching pages (admin, dashboard, reports) to Server Components. Use `async function Page()` with direct Prisma queries. Keep interactivity in leaf client components. | 🔴 HIGH |
| D2 | `app/dashboard/page.tsx` | 1-578 | **HIGH — Manual fetch in useEffect.** This is the pre-Next.js 13 pattern. With RSC or even SWR hooks (which already exist!), this is unnecessary boilerplate. | Convert to Server Component with direct data fetching, or use the existing `useStatistics()`/`useTrips()` SWR hooks. | 🔴 HIGH |
| D3 | `next.config.js` | 1 | **MEDIUM — CommonJS config.** Uses `module.exports` and `const { withSentryConfig } = require(...)`. Next.js 16 supports ESM config with `next.config.mjs` or `next.config.ts`. | Rename to `next.config.ts` and use ES module imports. TypeScript config gives type safety and autocomplete. | 🟡 MEDIUM |
| D4 | `app/api/*/route.ts` | varies | **MEDIUM — Manual JSON responses without type safety.** All API routes manually construct `NextResponse.json({ ... })` without consistent response types or error formats. | Create typed API response helpers: `apiSuccess<T>(data: T)`, `apiError(message, status)`. Consider tRPC or a shared response schema. | 🟡 MEDIUM |
| D5 | `hooks/use-auth.tsx` | ALL | **MEDIUM — Client-side auth pattern.** Fetches `GET /api/auth/me` on every page load to check auth. This is the pre-Next.js 13 pattern. With server components, auth can be checked server-side with zero client JS. | Use server-side auth checks in layouts/pages. Pass auth data as props to client components that need it. | 🟡 MEDIUM |
| D6 | `lib/prisma.ts` | 1-42 | **MEDIUM — Manual singleton pattern.** The `globalThis.__prisma` pattern is needed, but `connection_limit=1` in the URL is a bottleneck. Prisma 7 with `@prisma/adapter-pg` handles pooling differently. | Review connection pooling strategy. With Supabase pgbouncer, use the pooler URL (port 6543) and remove `connection_limit=1`. | 🟡 MEDIUM |
| D7 | `app/api/auth/login/route.ts` | 35-40 | **LOW — Artificial delay for brute force protection.** Uses `await new Promise(r => setTimeout(r, 1000))` for rate limiting. With proper middleware rate limiting (once B1 is fixed), this is redundant. | Keep as defense-in-depth but reduce to 200-300ms. The real protection should come from the rate limiter in middleware. | 🟢 LOW |
| D8 | `app/globals.css` | 1-254 | **LOW — Heavy custom CSS.** 254 lines of custom CSS including animations, gradients, and component styles. Tailwind 4.2 + CSS-in-JS utilities can handle most of this. | Move animations to Tailwind's `@keyframes` directive. Use Tailwind utilities for gradients. Reduce custom CSS to <50 lines. | 🟢 LOW |
| D9 | `public/sw.js` | - | **LOW — Manual service worker.** Next.js 16 supports `next-pwa` or `@serwist/next` for managed PWA + service workers with better caching strategies. | Consider migrating to `@serwist/next` for typed, auto-generated service workers with proper precaching. | 🟢 LOW |

---

## 🚀 5. MODERN FEATURES NOT USED

| # | Feature | Where to Apply | Impact | How to Implement | Priority |
|---|---------|---------------|--------|-----------------|----------|
| M1 | **React Server Components** (React 18+, Next.js 13+) | All pages | Eliminates 80%+ of client JS. Direct DB access in components. Streaming HTML. | Convert `app/admin/page.tsx`, `app/dashboard/page.tsx`, etc. to `async function Page()` without "use client". Query Prisma directly. | 🔴 HIGH |
| M2 | **Server Actions** (Next.js 14+, stable in 16) | All form submissions | Eliminates API routes for mutations. Type-safe server functions. Built-in progressive enhancement. | Create `actions/` directory. Convert POST/PUT/DELETE API routes into `'use server'` functions. Use `useActionState()` in forms. | 🔴 HIGH |
| M3 | **React 19 `use()` hook** | Data fetching components | Simplifies async data loading. Works with Suspense boundaries. No need for `useEffect` + `useState` pattern. | Replace `useEffect(() => { fetch(...).then(setData) }, [])` with `const data = use(fetchPromise)` wrapped in `<Suspense>`. | 🟡 MEDIUM |
| M4 | **React 19 `useOptimistic()`** | Trip status updates, notifications | Instant UI feedback for mutations before server confirms. Better UX. | Use in trip start/stop, notification mark-read: `const [optimistic, addOptimistic] = useOptimistic(trips, reducer)` | 🟡 MEDIUM |
| M5 | **React 19 `useFormStatus()`** | Login form, admin forms | Built-in pending state for forms. No manual `isLoading` state. | In submit buttons: `const { pending } = useFormStatus(); <button disabled={pending}>` | 🟡 MEDIUM |
| M6 | **Next.js Parallel Routes** (Next.js 13.3+) | Dashboard page | Load dashboard sections (stats, trips, calendar) in parallel with independent loading states. | Create `app/dashboard/@stats/page.tsx`, `app/dashboard/@trips/page.tsx`, etc. Each segment loads independently. | 🟡 MEDIUM |
| M7 | **Next.js `loading.tsx`** (Next.js 13+) | All route segments | Automatic loading UI with React Suspense. Currently no loading states between navigations. | Create `app/admin/loading.tsx`, `app/dashboard/loading.tsx`, etc. with skeleton UIs. | 🟡 MEDIUM |
| M8 | **Prisma 7 Typed SQL** | Complex queries | The raw SQL in `tracking/route.ts` loses type safety. Prisma 7's typed SQL restores it. | Use `prisma.$queryRawTyped(sql\`SELECT ...\`)` with generated types for raw queries. | 🟢 LOW |
| M9 | **Next.js Metadata API** | All pages | SEO, social sharing, PWA metadata. Currently only set in `layout.tsx` root. | Add `export const metadata = { title, description }` or `generateMetadata()` in each page. | 🟢 LOW |
| M10 | **Next.js Route Handlers streaming** | Statistics, large lists | Stream large responses instead of buffering. Better TTFB. | Use `return new Response(stream)` with `ReadableStream` for endpoints returning large datasets. | 🟢 LOW |
| M11 | **Zod 4 Features** | Validation schemas | Zod 4 (which you're already on) has improved `.pipe()`, `.transform()`, and better error messages. | Upgrade validation schemas to use Zod 4's `z.interface()` for better TS inference and `z.templateLiteral()` for string patterns. | 🟢 LOW |

---

## 🎯 Prioritized Action Plan

### Phase 1 — CRITICAL (Do Immediately) 🚨

1. **Rename `proxy.ts` → `middleware.ts`** and rename `proxy()` → `middleware()` (B1/S1)
2. **Fix `supabase-server.ts`** — stop using `SERVICE_ROLE_KEY` as default (S2)
3. **Fix `auth/register`** — remove the auth cookie set after user creation (B2)
4. **Add auth to `admin/drivers-users`** (S3)
5. **Add auth to ALL mutation handlers** (POST/PUT/DELETE in buses, districts, drivers, etc.) (S4)
6. **Fix `tsconfig.json`** — change `jsx` to `"preserve"` (B11)

### Phase 2 — HIGH (This Sprint)

7. **Fix N+1 in Excel import** — batch operations (P1)
8. **Replace 5-second notification polling** with SSE or longer interval (P2)
9. **Consolidate dual trip tables query** (P3/B13)
10. **Use existing SWR hooks in dashboard** (P5/D2)
11. **Fix timer leak in query-cache** (B3)
12. **Add file type validation to import** (S10)
13. **Begin Server Component migration** for read-only pages (D1/M1)

### Phase 3 — MEDIUM (Next Sprint)

14. Fix memory leaks in caches (B5, P7)
15. Extract shared `getBusLocations()` (B6)
16. Reduce statistics query count (P4)
17. Add CSP header (S6)
18. Add code splitting with `dynamic()` (P10)
19. Implement Server Actions for forms (M2)
20. Fix timing attack in login (S7)

### Phase 4 — LOW (Backlog)

21. Add composite DB indexes (P11)
22. Add notification pagination (P12)
23. Migrate to ESM config (D3)
24. Remove dead BusLocation model (B12)
25. Implement React 19 hooks (M3-M5)
26. Add loading.tsx files (M7)
27. Migrate service worker to @serwist/next (D9)

---

## 📊 File-by-File Issue Count

| File | Issues | Highest Priority |
|------|--------|-----------------|
| `proxy.ts` | 2 | 🔴 CRITICAL |
| `lib/supabase-server.ts` | 1 | 🔴 CRITICAL |
| `app/api/auth/register/route.ts` | 1 | 🔴 CRITICAL |
| `app/api/import/excel/route.ts` | 2 | 🔴 CRITICAL |
| `tsconfig.json` | 1 | 🔴 HIGH |
| `app/api/admin/drivers-users/route.ts` | 1 | 🔴 HIGH |
| `app/api/buses/route.ts` | 2 | 🔴 HIGH |
| `app/api/trips/route.ts` | 2 | 🔴 HIGH |
| `app/api/statistics/route.ts` | 2 | 🔴 HIGH |
| `app/dashboard/page.tsx` | 3 | 🔴 HIGH |
| `components/notification-center.tsx` | 2 | 🔴 HIGH |
| `lib/query-cache.ts` | 1 | 🔴 HIGH |
| `lib/cache.ts` | 1 | 🟡 MEDIUM |
| `lib/web-push.ts` | 1 | 🟡 MEDIUM |
| `lib/jwt-config.ts` | 1 | 🟡 MEDIUM |
| `next.config.js` | 2 | 🟡 MEDIUM |
| `app/api/tracking/route.ts` | 3 | 🟡 MEDIUM |
| `app/api/tracking/stream/route.ts` | 1 | 🟡 MEDIUM |
| `app/api/driver/my-bus/route.ts` | 1 | 🟡 MEDIUM |
| `app/api/driver/dashboard/route.ts` | 1 | 🟡 MEDIUM |
| `app/api/notifications/route.ts` | 1 | 🟢 LOW |
| `prisma/schema.prisma` | 2 | 🟢 LOW |
| `app/globals.css` | 1 | 🟢 LOW |
| `public/sw.js` | 1 | 🟢 LOW |
| `hooks/use-auth.tsx` | 1 | 🟡 MEDIUM |
| `lib/prisma.ts` | 1 | 🟡 MEDIUM |
| `app/page.tsx` | 1 | 🟡 MEDIUM |
| All API routes (shared patterns) | 4 | 🟡 MEDIUM |

---

*Report covers 57 findings across 28+ files. All files in the project were read and analyzed.*
