# File: tools\setup-and-review.ps1
# Run from repo root:
#   pwsh -ExecutionPolicy Bypass -File .\tools\setup-and-review.ps1
# Options:
#   pwsh -ExecutionPolicy Bypass -File .\tools\setup-and-review.ps1 -OnlyPatch
#   pwsh -ExecutionPolicy Bypass -File .\tools\setup-and-review.ps1 -SkipInstall
#   pwsh -ExecutionPolicy Bypass -File .\tools\setup-and-review.ps1 -SkipReview

[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipReview,
  [switch]$OnlyPatch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "OK  $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "WARN $msg" -ForegroundColor Yellow }

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  Ensure-Dir (Split-Path -Parent $Path)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $normalized = $Content.Replace("`r`n", "`n")
  [System.IO.File]::WriteAllText($Path, $normalized, $utf8NoBom)
}

function Read-Text([string]$Path) {
  if (-not (Test-Path $Path)) { return "" }
  return Get-Content -LiteralPath $Path -Raw
}

function Backup-File([string]$Path, [string]$BackupDir) {
  if (Test-Path $Path) {
    $dest = Join-Path $BackupDir ($Path -replace "[:\\\/]", "_")
    Copy-Item -Force $Path $dest
  }
}

function Assert-RepoRoot {
  if (-not (Test-Path ".\package.json")) { throw "Run from repo root: missing package.json" }
  if (-not (Test-Path ".\client")) { throw "Missing .\client folder" }
  if (-not (Test-Path ".\shared")) { throw "Missing .\shared folder" }
  Ensure-Dir ".\tools"
}

function Update-JsonFile([string]$Path, [scriptblock]$Mutator) {
  if (-not (Test-Path $Path)) { throw "Missing JSON file: $Path" }
  $raw = Get-Content -LiteralPath $Path -Raw
  $obj = $raw | ConvertFrom-Json
  & $Mutator $obj | Out-Null
  $json = $obj | ConvertTo-Json -Depth 60
  Write-Utf8NoBom $Path ($json + "`n")
}

function Merge-Dependency([hashtable]$deps, [string]$name, [string]$version) { $deps[$name] = $version }
function Remove-Dependency([hashtable]$deps, [string]$name) { if ($deps.ContainsKey($name)) { $deps.Remove($name) | Out-Null } }

function Patch-RootPackageJson {
  Write-Info "Patch: root package.json (tooling + Tailwind alignment)"
  Update-JsonFile ".\package.json" {
    param($pkg)

    if (-not ($pkg.PSObject.Properties.Name -contains "scripts")) { $pkg | Add-Member NoteProperty scripts @{} }
    if (-not ($pkg.PSObject.Properties.Name -contains "devDependencies")) { $pkg | Add-Member NoteProperty devDependencies @{} }
    if (-not ($pkg.PSObject.Properties.Name -contains "dependencies")) { $pkg | Add-Member NoteProperty dependencies @{} }

    $scripts = @{}
    $pkg.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = $_.Value }

    $devDeps = @{}
    $pkg.devDependencies.PSObject.Properties | ForEach-Object { $devDeps[$_.Name] = $_.Value }

    $deps = @{}
    $pkg.dependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value }

    # Review pipeline scripts (keeps your dev/build scripts)
    if (-not $scripts.ContainsKey("dev")) { $scripts["dev"] = "tsx watch shared/server/index.ts" }
    if (-not $scripts.ContainsKey("build")) { $scripts["build"] = "tsx script/build.ts" }

    $scripts["format"] = "biome format ."
    $scripts["lint"] = "biome lint ."
    $scripts["check"] = "biome check ."
    $scripts["typecheck"] = "tsc -p tsconfig.json --noEmit"
    $scripts["test"] = "vitest run"
    $scripts["audit"] = "npm audit --audit-level=high"
    $scripts["fix"] = "node tools/review-project.mjs fix"
    $scripts["review"] = "node tools/review-project.mjs run"

    # Tooling deps
    Merge-Dependency $devDeps "@biomejs/biome" "^1.9.4"
    Merge-Dependency $devDeps "vitest" "^2.1.3"

    # Tailwind v4 alignment (you already use @tailwindcss/vite -> tailwindcss should be v4)
    Merge-Dependency $devDeps "@tailwindcss/vite" "^4.1.18"
    Merge-Dependency $devDeps "tailwindcss" "^4.1.18"

    # Ensure tw-animate-css is present, remove deprecated tailwindcss-animate
    Remove-Dependency $deps "tailwindcss-animate"
    Remove-Dependency $devDeps "tailwindcss-animate"

    if ($deps.ContainsKey("tw-animate-css")) {
      $tw = $deps["tw-animate-css"]
      Remove-Dependency $deps "tw-animate-css"
      Merge-Dependency $devDeps "tw-animate-css" $tw
    } elseif (-not $devDeps.ContainsKey("tw-animate-css")) {
      Merge-Dependency $devDeps "tw-animate-css" "^1.2.5"
    }

    $pkg.scripts = $scripts
    $pkg.devDependencies = $devDeps
    $pkg.dependencies = $deps
  }
  Write-Ok "root package.json patched"
}

function Patch-FunctionsPackageJson {
  if (-not (Test-Path ".\functions\package.json")) {
    Write-Warn "functions/package.json not found; skipping"
    return
  }
  Write-Info "Patch: functions/package.json (build/typecheck/lint/test)"
  Update-JsonFile ".\functions\package.json" {
    param($pkg)

    if (-not ($pkg.PSObject.Properties.Name -contains "scripts")) { $pkg | Add-Member NoteProperty scripts @{} }
    if (-not ($pkg.PSObject.Properties.Name -contains "devDependencies")) { $pkg | Add-Member NoteProperty devDependencies @{} }
    if (-not ($pkg.PSObject.Properties.Name -contains "main")) { $pkg | Add-Member NoteProperty main "lib/index.js" }

    $scripts = @{}
    $pkg.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = $_.Value }

    $devDeps = @{}
    $pkg.devDependencies.PSObject.Properties | ForEach-Object { $devDeps[$_.Name] = $_.Value }

    $scripts["build"] = "tsc -p tsconfig.json"
    $scripts["typecheck"] = "tsc -p tsconfig.json --noEmit"
    $scripts["lint"] = "biome check ."
    $scripts["test"] = "vitest run"

    Merge-Dependency $devDeps "@biomejs/biome" "^1.9.4"
    Merge-Dependency $devDeps "typescript" "^5.6.3"
    Merge-Dependency $devDeps "vitest" "^2.1.3"
    if (-not $devDeps.ContainsKey("@types/node")) { Merge-Dependency $devDeps "@types/node" "^20.19.27" }

    $pkg.scripts = $scripts
    $pkg.devDependencies = $devDeps
    $pkg.main = "lib/index.js"
  }
  Write-Ok "functions/package.json patched"
}

function Write-ToolingFiles {
  Write-Info "Write: biome.json, tsconfig.json, vitest.config.ts, tools/review-project.mjs"

  $biome = @'
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": { "enabled": true, "indentStyle": "space", "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "files": {
    "ignore": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.firebase/**",
      "**/.vite/**",
      "**/lib/**"
    ]
  }
}
'@

  $tsconfig = @'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": [
    "client/src/**/*.ts",
    "client/src/**/*.tsx",
    "shared/**/*.ts",
    "functions/**/*.ts"
  ],
  "exclude": ["node_modules", "dist", "build", "lib"]
}
'@

  $vitest = @'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"]
  }
});
'@

  $reviewRunner = @'
#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function run(cmd, args, cwd = process.cwd()) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd, shell: process.platform === "win32" });
  return r.status ?? 1;
}

function summarize(results) {
  const bad = results.filter((r) => r.code !== 0);
  console.log("\n==== Summary ====");
  for (const r of results) console.log(`- ${r.name}: ${r.code === 0 ? "OK" : `FAIL(${r.code})`}`);
  process.exit(bad.length ? 1 : 0);
}

const cmd = process.argv[2];
if (!cmd || !["fix", "run"].includes(cmd)) {
  console.log("Usage: node tools/review-project.mjs <fix|run>");
  process.exit(2);
}

if (cmd === "fix") {
  summarize([
    { name: "biome check --write", code: run("npx", ["-y", "@biomejs/biome", "check", ".", "--write"]) }
  ]);
}

if (cmd === "run") {
  const results = [];
  results.push({ name: "biome check", code: run("npx", ["-y", "@biomejs/biome", "check", "."]) });
  results.push({ name: "typecheck", code: run("npm", ["run", "typecheck"]) });
  results.push({ name: "test", code: run("npm", ["run", "test"]) });
  results.push({ name: "audit", code: run("npm", ["run", "audit"]) });
  results.push({ name: "build", code: run("npm", ["run", "build"]) });

  const functionsDir = join(process.cwd(), "functions");
  if (existsSync(join(functionsDir, "package.json"))) {
    results.push({ name: "functions: npm install", code: run("npm", ["install"], functionsDir) });
    results.push({ name: "functions: typecheck", code: run("npm", ["run", "typecheck"], functionsDir) });
    results.push({ name: "functions: build", code: run("npm", ["run", "build"], functionsDir) });
  }

  summarize(results);
}
'@

  Write-Utf8NoBom ".\biome.json" $biome
  Write-Utf8NoBom ".\tsconfig.json" $tsconfig
  Write-Utf8NoBom ".\vitest.config.ts" $vitest
  Write-Utf8NoBom ".\tools\review-project.mjs" $reviewRunner

  Write-Ok "tooling files written"
}

function Patch-ViteConfig {
  Write-Info "Patch: vite.config.ts (async config + @tailwindcss/vite + safe paths)"
  $content = @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(async () => {
  const isProd = process.env.NODE_ENV === "production";
  const isReplit = process.env.REPL_ID !== undefined;

  const extraPlugins: any[] = [];
  if (!isProd && isReplit) {
    const [{ cartographer }, { devBanner }] = await Promise.all([
      import("@replit/vite-plugin-cartographer"),
      import("@replit/vite-plugin-dev-banner"),
    ]);
    extraPlugins.push(cartographer(), devBanner());
  }

  return {
    plugins: [tailwindcss(), react(), runtimeErrorOverlay(), ...extraPlugins],
    resolve: {
      alias: {
        "@": path.resolve(repoRoot, "client", "src"),
        "@shared": path.resolve(repoRoot, "shared"),
        "@assets": path.resolve(repoRoot, "attached_assets"),
      },
    },
    root: path.resolve(repoRoot, "client"),
    build: {
      outDir: path.resolve(repoRoot, "dist", "public"),
      emptyOutDir: true,
      sourcemap: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
'@
  Write-Utf8NoBom ".\vite.config.ts" $content
  Write-Ok "vite.config.ts patched"
}

function Patch-TailwindConfig {
  $path = ".\tailwind.config.ts"
  if (-not (Test-Path $path)) {
    Write-Warn "tailwind.config.ts not found; creating"
  }
  Write-Info "Patch: tailwind.config.ts (ESM plugins, remove tailwindcss-animate)"
  $content = @'
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem",
        md: ".375rem",
        sm: ".1875rem",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)",
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
'@
  Write-Utf8NoBom $path $content
  Write-Ok "tailwind.config.ts patched"
}

function Patch-ClientCss {
  $cssPath = ".\client\src\index.css"
  if (-not (Test-Path $cssPath)) {
    Write-Warn "client/src/index.css not found; skipping"
    return
  }
  Write-Info "Patch: client/src/index.css (Tailwind v4 import + tw-animate-css import)"
  $raw = Read-Text $cssPath

  # Remove old Tailwind v3 directives if present
  $raw = $raw -replace "(?m)^\s*@tailwind\s+base;\s*$", "" `
             -replace "(?m)^\s*@tailwind\s+components;\s*$", "" `
             -replace "(?m)^\s*@tailwind\s+utilities;\s*$", ""

  $hasTailwindImport = $raw -match '(?m)^\s*@import\s+"tailwindcss";\s*$'
  $hasAnimateImport = $raw -match '(?m)^\s*@import\s+"tw-animate-css";\s*$'

  $imports = @()
  if (-not $hasTailwindImport) { $imports += '@import "tailwindcss";' }
  if (-not $hasAnimateImport) { $imports += '@import "tw-animate-css";' }

  if ($imports.Count -gt 0) {
    if ($raw -match '(?m)^\s*@charset\s+"[^"]+"\s*;\s*$') {
      $raw = $raw -replace '(?m)^(\s*@charset\s+"[^"]+"\s*;\s*$)', ('$1' + "`n" + ($imports -join "`n"))
    } else {
      $raw = ($imports -join "`n") + "`n" + $raw.TrimStart()
    }
  }

  Write-Utf8NoBom $cssPath ($raw.TrimEnd() + "`n")
  Write-Ok "client/src/index.css patched"
}

function Patch-FunctionsIndexTs {
  $path = ".\functions\src\index.ts"
  if (-not (Test-Path $path)) {
    $path = ".\functions\index.ts"
    if (-not (Test-Path $path)) {
      Write-Warn "functions entry not found (functions/src/index.ts or functions/index.ts); skipping"
      return
    }
  }
  Write-Info "Patch: functions index.ts (init once + body parsers + error handling)"
  $content = @'
import * as functions from "firebase-functions";
import express, { type Request, type Response } from "express";
import { createServer } from "node:http";
import { registerRoutes } from "../../shared/server/routes";

const app = express();
app.set("trust proxy", true);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const httpServer = createServer(app);

let readyPromise: Promise<unknown> | null = null;
function ensureReady() {
  if (!readyPromise) readyPromise = Promise.resolve(registerRoutes(httpServer, app));
  return readyPromise;
}

export const api = functions
  .region("asia-southeast1")
  .https.onRequest(async (req: Request, res: Response) => {
    try {
      await ensureReady();
      return app(req, res);
    } catch (err) {
      console.error("Function init/handler error:", err);
      if (!res.headersSent) res.status(500).send("Internal Server Error");
      return;
    }
  });
'@
  Write-Utf8NoBom $path $content
  Write-Ok "functions index.ts patched"
}

function Patch-SharedRoutesTs {
  $path = ".\shared\server\routes.ts"
  if (-not (Test-Path $path)) {
    Write-Warn "shared/server/routes.ts not found; skipping"
    return
  }
  Write-Info "Patch: shared/server/routes.ts (id parsing + async wrapper + central error handler)"
  $content = @'
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { firestore } from "./db";

type AuthedUser = { id: number | string; role?: string };

function parseId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isFinite(id) ? id : null;
}

function requireAuth(req: Request, res: Response): AuthedUser | null {
  if (!req.isAuthenticated?.()) {
    res.status(401).send("Unauthorized");
    return null;
  }
  return req.user as AuthedUser;
}

function requireRole(user: AuthedUser, res: Response, ...roles: string[]): boolean {
  const role = String((user as any)?.role ?? "");
  if (!roles.includes(role)) {
    res.status(403).send("Forbidden");
    return false;
  }
  return true;
}

function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  app.get(api.products.list.path, asyncRoute(async (_req, res) => {
    res.json(await storage.getProducts());
  }));

  app.get(api.auth.health.path, asyncRoute(async (_req, res) => {
    try {
      await firestore.listCollections();
      res.json({ status: "ok" });
    } catch (err: any) {
      console.error("Health check failed", err);
      res.status(503).json({ status: "error", message: err?.message });
    }
  }));

  app.get(api.products.get.path, asyncRoute(async (req, res) => {
    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });
    const product = await storage.getProduct(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  }));

  app.post(api.products.create.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    try {
      const input = api.products.create.input.parse(req.body);
      res.status(201).json(await storage.createProduct(input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.put(api.products.update.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    try {
      const input = api.products.update.input.parse(req.body);
      res.json(await storage.updateProduct(id, input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.delete(api.products.delete.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    const product = await storage.getProduct(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await storage.deleteProduct(id);
    res.sendStatus(200);
  }));

  app.post(api.products.batchCreate.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    try {
      const input = api.products.batchCreate.input.parse(req.body);
      const products = await Promise.all(input.map((p: any) => storage.createProduct(p)));
      res.status(201).json(products);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.get(api.orders.list.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const role = String((user as any).role ?? "");
    if (role === "admin" || role === "accounting") {
      res.json(await storage.getOrders());
    } else {
      res.json(await storage.getOrdersByUser((user as any).id));
    }
  }));

  app.get(api.orders.get.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  }));

  app.post(api.orders.create.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder({
        ...input,
        createdBy: (user as any).id,
        items: input.items || [],
        total: input.total || "0",
      });
      res.status(201).json(order);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.put(api.orders.update.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    try {
      const input = api.orders.update.input.parse(req.body);
      res.json(await storage.updateOrder(id, input as any));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.get(api.users.list.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;
    res.json(await storage.getUsers());
  }));

  app.post(api.users.create.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    try {
      const input = api.users.create.input.parse(req.body);
      res.status(201).json(await storage.createUser(input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.delete(api.users.delete.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    await storage.deleteUser(id);
    res.sendStatus(200);
  }));

  app.get(api.categories.list.path, asyncRoute(async (_req, res) => {
    res.json(await storage.getCategories());
  }));

  app.post(api.categories.create.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    try {
      const input = api.categories.create.input.parse(req.body);
      res.status(201).json(await storage.createCategory(input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.put(api.categories.update.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    try {
      const input = api.categories.update.input.parse(req.body);
      res.json(await storage.updateCategory(id, input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.delete(api.categories.delete.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    await storage.deleteCategory(id);
    res.sendStatus(200);
  }));

  app.get(api.promotions.list.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;
    res.json(await storage.getPromotions());
  }));

  app.post(api.promotions.create.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    try {
      const input = api.promotions.create.input.parse(req.body);
      res.status(201).json(await storage.createPromotion(input));
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  }));

  app.delete(api.promotions.delete.path, asyncRoute(async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    if (!requireRole(user, res, "admin")) return;

    const id = parseId(req);
    if (id === null) return res.status(400).json({ message: "Invalid id" });

    await storage.deletePromotion(id);
    res.sendStatus(200);
  }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled route error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Internal Server Error" });
  });

  return httpServer;
}

export async function seedDatabase() {
  try {
    const admin = await storage.getUserByUsername("admin");
    if (!admin) {
      console.log("Seeding database...");
      await storage.createUser({ username: "admin", pin: "1111", role: "admin", name: "Admin User" });
      await storage.createUser({ username: "staff", pin: "2222", role: "staff", name: "Staff User" });
      await storage.createUser({ username: "account", pin: "3333", role: "accounting", name: "Accounting User" });

      const defaultCategory = await storage.createCategory({ name: "Skincare", colorTag: "#D4B16A" });

      await storage.createProduct({
        name: "Anti-Aging Serum",
        description: "Premium gold-infused serum",
        price: "1500.00",
        categoryId: defaultCategory.id,
        images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Serum"],
        stock: 100,
      });

      await storage.createProduct({
        name: "Hydrating Cream",
        description: "Deep moisture lock",
        price: "950.00",
        categoryId: defaultCategory.id,
        images: ["https://placehold.co/600x400/171A1D/D4B16A?text=Cream"],
        stock: 50,
      });
    }

    const demoUsers = [{ username: "aaaaa", pin: "1111", role: "staff", name: "User AAAAA" }];
    for (const user of demoUsers) {
      const existing = await storage.getUserByUsername(user.username);
      if (!existing) await storage.createUser(user);
    }
  } catch (err) {
    console.warn("Skipping seed (Firestore unavailable):", (err as Error)?.message ?? err);
  }
}
'@
  Write-Utf8NoBom $path $content
  Write-Ok "shared/server/routes.ts patched"
}

function Run-Npm([string[]]$Args, [string]$Cwd = ".") {
  Write-Info ("npm " + ($Args -join " ") + " (cwd=$Cwd)")
  $p = Start-Process -FilePath "npm" -ArgumentList $Args -WorkingDirectory $Cwd -NoNewWindow -PassThru -Wait
  if ($p.ExitCode -ne 0) { throw "npm failed with exit code $($p.ExitCode) in $Cwd" }
}

# ---------------- MAIN ----------------
Assert-RepoRoot

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$script:BackupDir = Join-Path ".\tools" ("backup_" + $timestamp)
Ensure-Dir $script:BackupDir
Write-Utf8NoBom ".\tools\LAST_BACKUP_DIR.txt" ($script:BackupDir + "`n")

Write-Info "Backup directory: $script:BackupDir"
Write-Info "Saved to: tools\LAST_BACKUP_DIR.txt"

$filesToBackup = @(
  ".\package.json",
  ".\vite.config.ts",
  ".\tailwind.config.ts",
  ".\client\src\index.css",
  ".\functions\package.json",
  ".\functions\src\index.ts",
  ".\functions\index.ts",
  ".\shared\server\routes.ts",
  ".\biome.json",
  ".\tsconfig.json",
  ".\vitest.config.ts",
  ".\tools\review-project.mjs"
)
foreach ($f in $filesToBackup) { Backup-File $f $script:BackupDir }

Write-Info "Applying ALL patches..."
Patch-RootPackageJson
Patch-FunctionsPackageJson
Write-ToolingFiles
Patch-ViteConfig
Patch-TailwindConfig
Patch-ClientCss
Patch-FunctionsIndexTs
Patch-SharedRoutesTs

if ($OnlyPatch) {
  Write-Ok "OnlyPatch completed."
  Write-Host "BackupDir: $script:BackupDir"
  exit 0
}

if (-not $SkipInstall) {
  Run-Npm @("install")
} else {
  Write-Warn "SkipInstall enabled (not running npm install)"
}

if (-not $SkipReview) {
  Run-Npm @("run","fix")
  Run-Npm @("run","review")
} else {
  Write-Warn "SkipReview enabled (not running npm run fix/review)"
}

Write-Ok "DONE"
Write-Host "BackupDir: $script:BackupDir"
Write-Host "Last backup file: tools\LAST_BACKUP_DIR.txt"
