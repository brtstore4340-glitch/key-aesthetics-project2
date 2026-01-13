# Confirmation Order System

## Overview

A mobile-first web application for managing clinic/sales confirmation order forms. Staff can draft orders, attach documents, and submit for admin verification. The system features role-based access control (admin, staff, accounting), a dark-themed UI with gold accents, and Firebase-backed persistence.

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
- **Path Aliases**: `@/` maps to `client/src/`

### Backend Architecture (Firebase)
- **Authentication**: Firebase Auth (username + PIN mapped to email + password)
- **Database**: Firestore for products, categories, promotions, orders, and user profiles
- **Storage**: Firebase Storage for order attachments
- **Secure Logic**: Cloud Functions for user provisioning and order creation/status updates

### Data Storage
- **Collections**: users, products, orders, categories, promotions
- **Indexes**: Composite index for orders by status + createdAt
- **Security Rules**: Firestore and Storage rules in `firebase/`

### Authentication & Authorization
- **Method**: Firebase Auth with user profile documents
- **Credentials**: Username + 4-digit PIN converted to email for Auth
- **Roles**: admin, staff, accounting with role-based UI rendering and rules

### Build & Development
- **Dev Server**: Vite dev server with HMR
- **Production Build**: Vite build output to `dist/public`

## External Dependencies

### Firebase
- Firebase SDK for Auth, Firestore, Storage, and Functions
- Firebase Admin SDK in Cloud Functions

### UI Libraries
- Radix UI primitives (dialog, dropdown, tabs, etc.)
- Tailwind CSS with class-variance-authority
- Lucide React for icons
- Embla Carousel for carousels
- React Day Picker for calendar components

### Form & Validation
- React Hook Form with @hookform/resolvers
- Zod for schema validation

### Development Tools
- Replit-specific plugins: vite-plugin-runtime-error-modal, vite-plugin-cartographer
- TypeScript with strict mode enabled
