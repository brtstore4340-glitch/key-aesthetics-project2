#!/usr/bin/env node
import { spawnSync } from "node:child_process";

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
    {
      name: "biome check --write",
      code: run("npx", ["-y", "@biomejs/biome", "check", ".", "--write"]),
    },
  ]);
}

if (cmd === "run") {
  summarize([
    { name: "biome check", code: run("npx", ["-y", "@biomejs/biome", "check", "."]) },
    { name: "typecheck", code: run("npm", ["run", "typecheck"]) },
    { name: "test", code: run("npm", ["run", "test"]) },
    { name: "audit", code: run("npm", ["run", "audit"]) },
    { name: "build", code: run("npm", ["run", "build"]) },
  ]);
}
