import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Return 404 for missing assets to prevent MIME type errors
  app.use("/assets/*", (_req, res) => {
    res.status(404).send("Asset not found");
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
