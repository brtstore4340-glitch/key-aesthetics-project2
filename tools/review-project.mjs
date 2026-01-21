#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function ensureDir(p) {
  try { mkdirSync(p, { recursive: true }); } catch {}
}

function run(cmd, args, cwd = process.cwd(), logFile = null) {
  const r = spawnSync(cmd, args, { cwd, shell: process.platform === "win32", encoding: "utf8" });
  if (logFile) {
    const out = `${cmd} ${args.join(" ")}\n\nSTDOUT:\n${r.stdout ?? ""}\n\nSTDERR:\n${r.stderr ?? ""}\n`;
    writeFileSync(logFile, out);
  } else {
    process.stdout.write(r.stdout ?? "");
    process.stderr.write(r.stderr ?? "");
  }
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

const logsDir = join(process.cwd(), "tools", "logs");
ensureDir(logsDir);

if (cmd === "fix") {
  summarize([
    {
      name: "biome check --write",
      code: run("npx", ["-y", "@biomejs/biome", "check", ".", "--write"], process.cwd(), join(logsDir, "biome-fix.log"))
    }
  ]);
}

if (cmd === "run") {
  const results = [];

  results.push({
    name: "biome check",
    code: run("npx", ["-y", "@biomejs/biome", "check", "."], process.cwd(), join(logsDir, "biome-check.log"))
  });

  results.push({
    name: "typecheck (root)",
    code: run("npm", ["run", "typecheck"], process.cwd(), join(logsDir, "typecheck-root.log"))
  });

  results.push({
    name: "test",
    code: run("npm", ["run", "test"], process.cwd(), join(logsDir, "test.log"))
  });

  // Audit: non-blocking unless STRICT_AUDIT=1
  const auditCode = run("npm", ["run", "audit"], process.cwd(), join(logsDir, "audit.log"));
  if (process.env.STRICT_AUDIT === "1") {
    results.push({ name: "audit (STRICT)", code: auditCode });
  } else {
    if (auditCode !== 0) console.warn("WARN audit failed (non-blocking). Set STRICT_AUDIT=1 to enforce.");
    results.push({ name: "audit (non-blocking)", code: 0 });
  }

  results.push({
    name: "build",
    code: run("npm", ["run", "build"], process.cwd(), join(logsDir, "build.log"))
  });

  // If functions is present, run its typecheck/build too (best effort)
  const functionsDir = join(process.cwd(), "functions");
  if (existsSync(join(functionsDir, "package.json"))) {
    results.push({
      name: "functions: npm install",
      code: run("npm", ["install"], functionsDir, join(logsDir, "functions-install.log"))
    });
    results.push({
      name: "functions: typecheck",
      code: run("npm", ["run", "typecheck"], functionsDir, join(logsDir, "functions-typecheck.log"))
    });
    results.push({
      name: "functions: build",
      code: run("npm", ["run", "build"], functionsDir, join(logsDir, "functions-build.log"))
    });
  }

  summarize(results);
}