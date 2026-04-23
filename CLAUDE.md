# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs API + Vite concurrently via npm-run-all)
npm run dev              # API on :5182, Vite on :5177 (proxies /api → :5182)
npm run dev:web          # Vite only
npm run dev:api          # nodemon server.cjs

# Build / preview the frontend bundle
npm run build
npm run preview

# Prisma / database
npm run prisma:generate  # regenerate client after schema.prisma edits
npm run prisma:push      # push schema to DB without a migration (dev shortcut)
npm run prisma:migrate   # create + apply a new migration
npm run prisma:studio    # open Prisma Studio
npm run prisma:reset     # ⚠️ wipes the DB
npm run db:setup         # generate + push (first-time bootstrap)
```

There is no test runner configured. ESLint config exists (`eslint.config.js`) but no `lint` script — invoke `npx eslint .` directly if needed.

## Architecture

This is a vehicle-shipping marketplace with three user roles (`CUSTOMER`, `CARRIER`, `ADMIN`) connecting customers shipping vehicles with carriers transporting them. It is a single-repo full-stack app: Vite + React 18 SPA on the frontend, Express + Prisma (PostgreSQL via Supabase) on the backend, with file storage in either `uploads/` locally or Supabase Storage.

### Process model and module systems

The repo mixes module systems on purpose:
- **Frontend** (`src/`) — ESM, `"type": "module"` in `package.json`, served by Vite.
- **Backend** (`server.cjs`, `server/**/*.cjs`) — CommonJS. The `.cjs` extension is required because the package is ESM; nodemon watches `*.cjs` only (`nodemon.json`).
- Vite dev server proxies `/api` → `http://localhost:5182` (`vite.config.js`). The frontend's `src/utils/request.js` uses relative `/api/...` URLs that rely on this proxy in dev.

### Backend layout

`server.cjs` is the single Express entry point. It wires every route inline (no `express.Router` for most domains) and **route ordering is load-bearing**: specific routes (e.g. `/api/customer/notifications/read-all`, `/api/admin/orders/:orderNumber/bol`, `/api/bookings/:id/bol`) must be declared **before** generic `/:id` routes. Comments in `server.cjs` flag this throughout — preserve the ordering when adding routes.

Server modules are organized as:

```
server/
  controllers/       # Express handlers, one file per domain; large domains split into subfolders
    booking/         # 11 sub-controllers (core, detail, cancel, bol, carrier.{loads,status,detention,exceptions,documents})
                     # booking.controller.cjs re-exports them via index.cjs
    quotes/          # split: create / read / update / pricing / debug
    payments/        # (subfolder reserved; payments.controller.cjs is the active file)
  services/          # Business logic, called from controllers
    booking/         # status, vehicle, fees, documents, authorization, helpers, constants
    quotes/          # pricing, repository, transform, validation, vehicle
  routes/            # Only time.routes.cjs and carrier.routes.cjs use express.Router; rest is in server.cjs
  middleware/        # auth.cjs (JWT), upload.cjs (multer)
  db.cjs             # Prisma singleton (also exposed as global.prisma in server.cjs)
  supabase.cjs       # Optional Supabase client — initializes only if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set
```

Auth middleware (`server/middleware/auth.cjs`) verifies `Authorization: Bearer <jwt>` and normalizes the user onto `req.userId`, `req.user.id`, `req.user.userId`, `req.userEmail`, `req.userRoles`. Role checks (`requireCarrier`, `requireAdmin`) are defined inline in `server.cjs` and read `User.roles` from Prisma. **`User.roles` is a comma-separated string column** (not a Prisma enum), checked via `roles.includes('ADMIN')`.

### The 6-step shipment status flow

Bookings move through a strict state machine defined in `server/services/booking/index.cjs` (`SHIPMENT_STATUS`, `validateStatusTransition`):

```
scheduled → assigned → on_the_way_to_pickup → arrived_at_pickup → picked_up → delivered
                                                                              ↘ cancelled (from any pre-delivery state)
```

Each transition writes a timestamp on the `Booking` row (`assignedAt`, `tripStartedAt`/`onTheWayAt`, `arrivedAtPickupAt`, `pickedUpAt`, `deliveredAt`). The detention timer starts at `arrivedAtPickupAt`; after `DETENTION_THRESHOLD_MINUTES` (60), the carrier becomes eligible for a `$50` detention fee (`booking.constants.cjs`). When extending the flow, update **all** of: status enum, `STATUS_ORDER`, `validateStatusTransition`, the corresponding carrier controller endpoint in `server.cjs`, and the matching frontend status labels.

`normalizeStatus()` accepts many legacy aliases (`pending`, `accepted`, `enroute`, `in_transit`, …) and maps them onto the canonical 6 — use it whenever reading status from older records or external input.

### Multi-vehicle bookings

A booking carries 1–3 vehicles. The schema supports two representations that coexist:
- **Legacy**: a single `pickup`/`dropoff` JSON blob plus `vehicleDetails` JSON on `Booking`.
- **Multi-stop**: separate `Stop` rows (stage = `pickup`|`dropoff`) and `BookingVehicle` rows that reference a `pickupStop` and `dropoffStop` independently. Per-vehicle gate passes live on `BookingVehicle.{pickup,dropoff}GatePassId`; legacy single gate passes live on `Booking.{pickup,dropoff}GatePassId`.

`enrichBookingWithVehicles()` in `server/services/booking/index.cjs` is the canonical reader — it merges both representations and returns a unified `{ vehicles, bookingVehicles, stops, vehiclesCount, isMultiVehicle }`. Use it instead of reading the JSON fields directly.

### Origin/destination types and gate passes

`ORIGIN_TYPES` are `auction`, `dealership`, `private` (residential). Auction and dealership pickups **require a gate pass document** (`isGatePassRequired`) and have flexible scheduling; residential pickups have strict time windows and detention enabled by default. Authorization logic for whether a carrier can attempt pickup lives in `server/services/booking/booking.authorization.service.cjs` and uses `AUTHORIZATION_STATUS` (`YES` / `YES_PROTECTED` / `NO`) plus a `TONU_FEE_AMOUNT` ($75) for "Truck Order Not Used" protection.

### Document storage

`POST /api/documents/upload` writes to `uploads/documents/` via multer (10 MB limit, PDF/JPEG/PNG only). When Supabase env vars are present, controllers may also push to the `documents` bucket — `Document.storageType` records which backend holds the file. `BOL` PDFs are generated on demand by `server/services/bol.service.cjs` (pdfkit) and served from the booking BOL routes.

### Frontend layout and routing

`src/main.jsx` mounts three providers (`AuthProvider`, `NotificationsProvider`, `CustomerNotificationsProvider`) around `<App />`. `src/app.jsx` defines all routes and uses three layout shells gated by `<ProtectedRoute allow={...}>`:

- `CustomerLayout` — `/dashboard/*`, `/customer-notifications`, `/shipper/*` (the multi-step shipper portal: offer → pickup → dropoff → vehicle → confirm → payment).
- `CarrierLayout` — `/carrier-dashboard`, `/carrier/*`, plus shared pages (`/payments`, `/documents`, `/profile`, `/analytics`, …) that are scoped to carriers.
- `AdminLayout` — `/admin/{orders,documents,customers,carriers}`.

`ProtectedRoute` accepts role names in lowercase (`"customer"`, `"carrier"`) for customer/carrier routes and uppercase (`"ADMIN"`) for admin. The mismatch is intentional — match the existing usage when adding new routes.

Per-domain API clients live in `src/services/*.api.js` and call through `src/utils/request.js`, which reads `import.meta.env.VITE_API_BASE` (empty in dev so the Vite proxy handles it).

### Environment

Required `.env` keys (see `.env` for the dev values currently committed):

- `DATABASE_URL` — PostgreSQL connection string (Supabase-hosted).
- `JWT_SECRET` — signs/verifies API tokens.
- `PORT` (default 5182), `HOST` (default localhost), `ALLOWED_ORIGINS` (comma-separated CORS list).
- `GOOGLE_MAPS_API_KEY` — used by `@googlemaps/google-maps-services-js` for distance lookups (`/api/distance`).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` — optional; enables cloud document storage.

### Useful scripts

`scripts/` contains one-off maintenance scripts that connect via Prisma (`seed-orders.mjs`, `wipe-database.mjs`, `backfill-time-windows.mjs`, `cleanup-seed-orders.mjs`, etc.). Run with `node scripts/<file>.mjs`. `scripts/migrate-json-to-postgres.js` is a legacy importer from the pre-Postgres JSON-store era and is exposed as `npm run migrate:json`.
