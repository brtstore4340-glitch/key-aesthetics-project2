# Confirmation Order System

## Overview

A mobile-first web application for managing clinic/sales confirmation order forms. Staff can draft orders, attach documents, and submit for admin verification. The system features role-based access control (admin, staff, accounting), a dark-themed UI with gold accents, and PostgreSQL-backed persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **Routing**: Wouter for lightweight client-side routing with protected route wrappers
- **State Management**: TanStack React Query for server state, with custom hooks per resource domain (useAuth, useOrders, useProducts)
- **UI Components**: shadcn/ui component library (New York style) with Radix UI primitives
- **Styling**: Tailwind CSS with dark mode default, custom CSS variables for theming (gold primary #D4B16A, dark backgrounds)
- **Animations**: Framer Motion for transitions and micro-interactions
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Passport.js with local strategy (username + PIN), express-session with PostgreSQL session store
- **API Pattern**: REST endpoints defined in `server/routes.ts`, with Zod schemas for validation
- **Type-Safe Routes**: Shared route definitions in `shared/routes.ts` with input/output schemas

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema sync
- **Session Store**: connect-pg-simple for persistent sessions
- **Core Tables**: users, products, orders, categories, promotions

### Authentication & Authorization
- **Method**: Session-based auth with Passport local strategy
- **Credentials**: Username + 4-digit PIN (not password-based)
- **Roles**: admin, staff, accounting with role-based UI rendering
- **Session Persistence**: PostgreSQL-backed session store with auto-table creation

### Build & Development
- **Dev Server**: Vite dev server with HMR, proxied through Express
- **Production Build**: Vite for client, esbuild for server bundling
- **Output**: `dist/public` for client assets, `dist/index.cjs` for server

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle ORM for type-safe database operations
- connect-pg-simple for session persistence

### UI Libraries
- Radix UI primitives (dialog, dropdown, tabs, etc.)
- Tailwind CSS with class-variance-authority
- Lucide React for icons
- Embla Carousel for carousels
- React Day Picker for calendar components

### Form & Validation
- React Hook Form with @hookform/resolvers
- Zod for schema validation (shared between client and server)
- drizzle-zod for automatic schema generation from database tables

### Development Tools
- Replit-specific plugins: vite-plugin-runtime-error-modal, vite-plugin-cartographer
- TypeScript with strict mode enabled