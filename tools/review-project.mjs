#!/usr/bin/env node
/**
 * Project Reviewer (Node/TS Monorepo)
 * - bootstrap standard configs
 * - auto-fix formatting/lint where possible
 * - run full review pipeline: format/lint/type/test/audit/build
 *
 * Usage:
 *   node tools/review-project.mjs bootstrap
 *   node tools/review-project.mjs fix
 *   node tools/review-project.mjs run
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const BIOME_JSON = `{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": { "enabled": true, "indentStyle": "space", "lineWidth": 100 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "off" }
    }
  },
  "files": {
    "ignore": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.firebase/**", "**/.vite/**"]
  }
}
`;

const VITEST_CONFIG = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    coverage: { enabled: false }
  }
});
`;

const GITIGNORE = `node_modules
dist
build
.env
.env.*
.firebase
.DS_Store
coverage
.vitest
`;

const EDITORCONFIG = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
`;

const CI_YML = `name: CI

on:
  push:
  pull_request:

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install
        run: npm ci

      - name: Review pipeline
        run: node tools/review-project.mjs run
`;

const ROOT_PACKAGE_JSON = `{
  "name": "key-aesthetics-project2",
  "private": true,
  "workspaces": ["client", "functions", "shared"],
  "scripts": {
    "bootstrap": "node tools/review-project.mjs bootstrap",
    "fix": "node tools/review-project.mjs fix",
    "review": "node tools/review-project.mjs run",

    "format": "biome format .",
    "lint": "biome lint .",
    "check": "biome check .",
    "typecheck": "npm -ws run typecheck",
    "test": "npm -ws run test",
    "audit": "npm audit --audit-level=high",

    "dev": "npm -w client run dev",
    "build": "npm -ws run build",
    "emulators": "firebase emulators:start"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
`;

const CLIENT_PACKAGE_JSON = `{
  "name": "@app/client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
`;

const FUNCTIONS_PACKAGE_JSON = `{
  "name": "@app/functions",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
`;

const SHARED_PACKAGE_JSON = `{
  "name": "@app/shared",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
`;

const TSCONFIG_BASE = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  }
}
`;

function run(cmd, args, { cwd = ROOT } = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd, shell: process.platform === "win32" });
  return r.status ?? 1;
}

function ensureFile(path, content) {
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function bootstrap() {
  ensureFile(join(ROOT, ".gitignore"), GITIGNORE);
  ensureFile(join(ROOT, ".editorconfig"), EDITORCONFIG);
  ensureFile(join(ROOT, "biome.json"), BIOME_JSON);
  ensureFile(join(ROOT, "vitest.config.ts"), VITEST_CONFIG);
  ensureFile(join(ROOT, "package.json"), ROOT_PACKAGE_JSON);
  ensureFile(join(ROOT, "tsconfig.base.json"), TSCONFIG_BASE);
  ensureFile(join(ROOT, ".github/workflows/ci.yml"), CI_YML);

  // Minimal workspace package.json if missing (won't overwrite your real ones)
  ensureFile(join(ROOT, "client/package.json"), CLIENT_PACKAGE_JSON);
  ensureFile(join(ROOT, "functions/package.json"), FUNCTIONS_PACKAGE_JSON);
  ensureFile(join(ROOT, "shared/package.json"), SHARED_PACKAGE_JSON);

  console.log("✅ Bootstrapped monorepo review configs.");
  console.log("Next: npm install (or npm ci) then: node tools/review-project.mjs run");
  return 0;
}

function summarize(results) {
  const bad = results.filter((x) => x.code !== 0);
  console.log("\n==== Summary ====");
  for (const r of results) console.log(`- ${r.name}: ${r.code === 0 ? "OK" : `FAIL(${r.code})`}`);
  return bad.length ? 1 : 0;
}

function fix() {
  const results = [];
  results.push({ name: "biome check --write", code: run("npx", ["-y", "@biomejs/biome", "check", ".", "--write"]) });
  return summarize(results);
}

function review() {
  const results = [];

  // Format/Lint (fast)
  results.push({ name: "biome check", code: run("npx", ["-y", "@biomejs/biome", "check", "."]) });

  // Typecheck across workspaces (expects each workspace has typecheck script)
  results.push({ name: "typecheck (workspaces)", code: run("npm", ["run", "typecheck"]) });

  // Unit tests across workspaces (optional if no tests yet)
  results.push({ name: "test (workspaces)", code: run("npm", ["run", "test"]) });

  // Security audit
  results.push({ name: "npm audit (high+)", code: run("npm", ["run", "audit"]) });

  // Build
  results.push({ name: "build (workspaces)", code: run("npm", ["run", "build"]) });

  return summarize(results);
}

function main() {
  const cmd = process.argv[2];
  if (!cmd || !["bootstrap", "fix", "run"].includes(cmd)) {
    console.log("Usage: node tools/review-project.mjs <bootstrap|fix|run>");
    process.exit(2);
  }
  if (cmd === "bootstrap") process.exit(bootstrap());
  if (cmd === "fix") process.exit(fix());
  if (cmd === "run") process.exit(review());
}

main();
