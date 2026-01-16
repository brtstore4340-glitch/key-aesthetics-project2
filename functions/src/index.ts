import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../../shared/server/routes";

// Build the Express app using existing route registration
const app = express();
const httpServer = createServer(app);
const ready = registerRoutes(httpServer, app);

setGlobalOptions({ region: "asia-southeast1" });

export const api = onRequest(async (req, res) => {
  await ready;
  return app(req, res);
});
