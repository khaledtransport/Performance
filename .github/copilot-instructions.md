# University Transport Management System - Copilot Instructions

## Project Overview
This is a comprehensive web application for managing university transportation services in Arabic. The system enables real-time tracking of bus trips, drivers, universities, and delegates (representatives).

## Architecture & Tech Stack

### Core Technologies
- **Next.js 14** with App Router (TypeScript)
- **Prisma ORM** with PostgreSQL database
- **TailwindCSS** with shadcn/ui components
- **React** with client-side state management

### Project Structure
```
app/
  api/            # RESTful API endpoints
  dashboard/      # Main control panel
  delegate/       # Representative interface
  admin/          # Admin management
components/ui/    # Reusable UI components
lib/              # Utilities and Prisma client
prisma/           # Database schema and seed
```

## Key Patterns & Conventions

### Database Schema
The system uses 6 main entities with relationships:
- **universities**: Basic university info
- **drivers**: Driver details
- **buses**: Bus fleet management
- **representatives**: Delegates who log trips
- **routes**: Base route templates linking university + driver + bus + representative
- **route_trips**: Daily trip instances with status tracking

**Critical relationship**: Each `route_trip` belongs to a `route`, which connects all base entities. This two-level structure allows template-based daily trip generation.

### API Design Pattern
All API routes follow consistent CRUD patterns:
- `GET /api/{resource}` - List all with relations
- `POST /api/{resource}` - Create new
- `GET /api/{resource}/[id]` - Get single with full relations
- `PUT /api/{resource}/[id]` - Update
- `DELETE /api/{resource}/[id]` - Delete (cascade deletes handled by Prisma)

**Important**: Always include relations in responses using Prisma's `include` to avoid N+1 queries.

### Arabic RTL Support
- All text is in Arabic
- Layout uses `dir="rtl"` in root layout
- UI components are styled for right-to-left reading
- Date/time formatting uses 'ar-SA' locale

### Trip Status Flow
```
PENDING → DEPARTED → ARRIVED
         ↓
      DELAYED
         ↓
      CANCELLED
```

**Status enum**: `PENDING`, `DEPARTED`, `ARRIVED`, `DELAYED`, `CANCELLED`
**Direction enum**: `GO` (ذهاب), `RETURN` (عودة)

### Time Slots
Predefined time slots for trips:
- **GO trips**: 08:30, 09:30, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30, المجمّع
- **RETURN trips**: 12:30, 13:30, 14:30, 15:30, 16:30, 17:30, المجمّع

These are hardcoded in delegate interface and Excel import.

## Development Workflows

### Adding New API Endpoints
1. Create route file in `app/api/{resource}/route.ts`
2. Import Prisma client from `@/lib/prisma`
3. Use Next.js route handlers: `export async function GET/POST/PUT/DELETE`
4. Always wrap in try-catch and return proper HTTP status codes
5. Include related data using Prisma's `include`

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` to sync without migrations
3. Run `npm run db:generate` to update Prisma client
4. Update seed file if needed: `prisma/seed.js`

### Creating UI Pages
1. Use 'use client' directive for interactive pages
2. Import components from `@/components/ui/*`
3. Use shadcn/ui components (Button, Card, Select, Input, etc.)
4. Follow existing color schemes: blue for admin, green for delegate
5. Include proper loading states and error handling

### Excel Import Logic
Located in `/api/import/excel/route.ts`:
- Accepts multipart form data with Excel file
- Uses `xlsx` library to parse
- Creates or finds entities (university, driver, bus, representative)
- Creates base route linking all entities
- Generates daily trips from time slot columns
- Maps column names to both Arabic and English variants

## Critical Implementation Details

### Prisma Client Singleton
Always use the singleton from `lib/prisma.ts` to avoid connection pool issues in development:
```typescript
import { prisma } from '@/lib/prisma'
```

### Date Handling
- Store dates as ISO strings in database
- Use `new Date().toISOString()` for trip dates
- Set hours to 00:00:00 for date comparisons
- Format display using `formatDate()` from `lib/utils.ts`

### Error Handling Pattern
```typescript
try {
  const data = await prisma.model.findMany()
  return NextResponse.json(data)
} catch (error) {
  return NextResponse.json({ error: 'Arabic error message' }, { status: 500 })
}
```

### Statistics Endpoint
`/api/statistics` provides aggregated data:
- Total trips, students, by status
- Driver performance (on-time percentage)
- University activity (trip count, student count)
- Accepts optional `?date=YYYY-MM-DD` query param

## Common Tasks

### To add a new field to trips:
1. Add column to `RouteTrip` model in schema
2. Run db:push
3. Update POST/PUT handlers in `/api/trips`
4. Update delegate form in `/app/delegate/page.tsx`
5. Update dashboard display in `/app/dashboard/page.tsx`

### To modify time slots:
1. Update arrays in `/app/delegate/page.tsx`
2. Update arrays in `/app/api/import/excel/route.ts`
3. Consider adding to database as configuration table for flexibility

### To add authentication:
System currently has no auth. To add:
1. Install NextAuth.js or similar
2. Protect API routes with middleware
3. Add role-based access (admin, representative, viewer)
4. Store user sessions

## Testing & Debugging

### Database Inspection
Use Prisma Studio: `npm run db:studio` - provides visual interface at http://localhost:5555

### API Testing
Use the API endpoints directly:
- GET requests: Browser or curl
- POST/PUT: Use Postman or Thunder Client extension
- Check Network tab in browser DevTools for frontend calls

### Seed Data
Run `npm run db:seed` to populate with sample data:
- 4 universities
- 5 drivers
- 5 buses
- 3 representatives
- 4 base routes
- Daily trips for today

## Important Gotchas

1. **Unique Constraints**: `busNumber` and university `name` must be unique
2. **Cascade Deletes**: Deleting a route deletes all its trips
3. **Time Zone**: No explicit timezone handling - assumes local server time
4. **Excel Format**: Import expects specific column names in Arabic
5. **Client Components**: Most pages use 'use client' for interactivity
6. **Build Errors**: TypeScript errors about missing modules are expected until `npm install` runs

## Code Style

- Use TypeScript strict mode
- Prefer async/await over promises
- Use arrow functions
- Include JSDoc comments for complex functions
- Arabic strings directly in JSX (no i18n library)
- Tailwind classes for styling (no CSS modules)
- shadcn/ui components over custom components

## Performance Considerations

- API responses include only necessary relations
- No pagination implemented (consider for large datasets)
- No caching layer (consider Redis for production)
- No real-time updates (consider WebSockets for live status)
- Images not optimized (no image handling currently)

## Future Enhancements
See README.md "التطوير المستقبلي" section for planned features like authentication, push notifications, PDF reports, and mobile app.
