# Project Notes

## Overview
Clinic/sales confirmation order system with mobile-first UI, role-based access (admin, staff, accounting), and Firestore-backed persistence.

## Frontend
- React 18 + TypeScript (Vite), Wouter routing, React Query for server state.
- shadcn/ui + Radix primitives; Tailwind CSS with dark theme and gold accent (#D4B16A).
- Aliases: `@/` -> `client/src/`, `@shared/` -> `shared/`.

## Backend
- Node.js (Express, ESM). Passport local auth (username + PIN) with express-session stored in Firestore.
- REST endpoints defined in `server/routes.ts`; schemas in `shared/routes.ts`.

## Data
- Firestore collections mirror `shared/schema.ts` types: users, products, orders, categories, promotions.
- Session documents stored in Firestore with TTL cleanup.
- Drizzle schemas kept for shared types only; no SQL migrations required.

## Build & Dev
- Dev: `npm run dev` (Vite + Express).
- Prod: `npm run build` -> `dist/public` (client) + `dist/index.cjs` (server bundle).

## Env
- Firestore auth via `FIREBASE_SERVICE_ACCOUNT` JSON string or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (replace `\n` in key with real newlines).

