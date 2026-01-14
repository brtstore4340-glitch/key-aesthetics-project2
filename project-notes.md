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

## Firebase deploy auth
- If `firebase deploy` fails with "Failed to authenticate, have you run firebase login?", run `firebase login` (or `firebase login --reauth`) in the same shell before deploying.
- In CI/non-interactive environments, use a service account by setting `GOOGLE_APPLICATION_CREDENTIALS` to the JSON key file path, or use `firebase login:ci` and set `FIREBASE_TOKEN` for the deploy.
- If auth still fails after login, try `firebase logout` then `firebase login --reauth`, update the CLI with `npm i -g firebase-tools`, and remove cached credentials (macOS/Linux: `~/.config/configstore/firebase-tools.json`; Windows: `%APPDATA%\\firebase-tools\\firebase-tools.json`).
- If push is rejected due to repository rule violations (e.g., required signed commits), enable signing and set a key before retrying: `git config commit.gpgsign true`, then `git config gpg.format ssh` and `git config user.signingkey <public-ssh-key>` (note: `git config gpg.format ssh` and `git config user.signingkey` are separate commands).
- If push still fails with rule violations, confirm the commit is actually signed and trusted by the host: re-commit after configuring signing, then run `git log --show-signature -1` to verify a signature; for SSH signing, upload the public key to GitHub under "SSH and GPG keys" and mark it for signing.
- If push is blocked by secret scanning, remove secrets from the commits (e.g., `.env`, `.env.local`), rotate any exposed keys, and rewrite history before pushing (use `git filter-repo` or `git rebase -i` to drop/clean commits). After cleanup, add the files to `.gitignore` and commit the removal so future pushes are clean.
