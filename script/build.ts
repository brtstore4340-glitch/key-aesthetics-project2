import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, ".."));

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "firebase-admin",
  "dotenv",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  const commonServerOptions = {
    // Server entry lives under shared/server
    entryPoints: ["shared/server/app.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  } as const;

  // Bundle for local/alternative deployments
  await esbuild({
    ...commonServerOptions,
    outfile: "dist/index.cjs",
  });

  // Bundle for Firebase Functions (picked up from functions/server.cjs)
  await esbuild({
    ...commonServerOptions,
    outfile: "functions/server.cjs",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
