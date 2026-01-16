# =========================================
# File: package.json (ROOT)  [PATCH - Tailwind v4 + review pipeline]
# =========================================
{
  "name": "rest-express",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "engines": "node": ">=20" ,
  "scripts": 
    "dev": "tsx watch shared/server/index.ts",
    "build": "tsx script/build.ts",

    "format": "biome format .",
    "lint": "biome lint .",
    "check": "biome check .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "audit": "npm audit --audit-level=high",

    "fix": "node tools/review-project.mjs fix",
    "review": "node tools/review-project.mjs run",
  "dependencies": 
    "@fontsource/dm-sans": "^5.1.0",
    "@fontsource/outfit": "^5.1.0",
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@tanstack/react-query": "^5.60.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "dotenv": "^17.2.3",
    "drizzle-orm": "^0.39.3",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^7.0.3",
    "framer-motion": "^11.18.2",
    "html-to-image": "^1.11.11",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.453.0",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.6",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "tailwind-merge": "^2.6.0",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "xlsx": "^0.18.5",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0",
  "devDependencies": 
    "@biomejs/biome": "^1.9.4",
    "@replit/vite-plugin-cartographer": "^0.4.4",
    "@replit/vite-plugin-dev-banner": "^0.1.1",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.18",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "20.19.27",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@types/xlsx": "^0.0.35",
    "@vitejs/plugin-react": "^4.7.0",
    "drizzle-kit": "^0.31.8",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.18",
    "tsx": "^4.20.5",
    "typescript": "5.6.3",
    "vite": "^7.3.0",
    "vitest": "^2.1.3",
  "optionalDependencies": 
    "bufferutil": "^4.0.8"
}

# =========================================
# File: functions/package.json  [PATCH - minimum usable scripts]
# =========================================
{
  "name": "functions",
  "version": "1.0.0",
  "private": true,
  "main": "lib/index.js",
  "engines": "node": "20" ,
  "scripts": 
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "biome check .",
    "test": "vitest run",
  "dependencies": 
    "express": "^4.21.2",
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^7.0.3",
  "devDependencies": 
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^20.19.27",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
}

# =========================================
# File: tools/review-project.mjs  [NEW]
# ==========================================
#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

function run(cmd, args, { cwd = ROOT } = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd, shell: process.platform === "win32" });
  return r.status ?? 1;
}

function ensureFile(path, content) {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

const BIOME_JSON = `{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": { "enabled": true, "indentStyle": "space", "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "files": {
    "ignore": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.firebase/**", "**/.vite/**", "**/lib/**"]
  }
}
`;

const TSCONFIG = `{
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
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build", "lib"]
}
`;

function bootstrap() {
  ensureFile(join(ROOT, "biome.json"), BIOME_JSON);
  ensureFile(join(ROOT, "tsconfig.json"), TSCONFIG);
  console.log("✅ bootstrapped biome.json + tsconfig.json");
}

function summarize(results) {
  const bad = results.filter((x) => x.code !== 0);
  console.log("\n==== Summary ====");
  for (const r of results) console.log(`- ${r.name}: ${r.code === 0 ? "OK" : `FAIL(${r.code})`}`);
  return bad.length ? 1 : 0;
}

function fix() {
  bootstrap();
  const results = [];
  results.push({ name: "biome check --write", code: run("npx", ["-y", "@biomejs/biome", "check", ".", "--write"]) });
  return summarize(results);
}

function review() {
  bootstrap();
  const results = [];
  results.push({ name: "biome check", code: run("npx", ["-y", "@biomejs/biome", "check", "."]) });
  results.push({ name: "typecheck", code: run("npm", ["run", "typecheck"]) });
  results.push({ name: "test", code: run("npm", ["run", "test"]) });
  results.push({ name: "audit", code: run("npm", ["run", "audit"]) });
  results.push({ name: "build", code: run("npm", ["run", "build"]) });
  return summarize(results);
}

const cmd = process.argv[2];
if (!cmd || !["bootstrap", "fix", "run"].includes(cmd)) {
  console.log("Usage: node tools/review-project.mjs <bootstrap|fix|run>");
  process.exit(2);
}
if (cmd === "bootstrap") process.exit((bootstrap(), 0));
if (cmd === "fix") process.exit(fix());
if (cmd === "run") process.exit(review());

# =========================================
# File: vite.config.ts  [NEW/RECOMMENDED - Tailwind v4 plugin]
# =========================================
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwind(), react()],
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    sourcemap: true
  }
});

# =========================================
# File: functions/tsconfig.json  [NEW - minimal]
# ==========================================
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "lib"]
}
