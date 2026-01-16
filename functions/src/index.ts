import { createServer } from "node:http";
import express from "express";
import * as functions from "firebase-functions";
import { registerRoutes } from "../../shared/server/routes";

// Build the Express app using existing route registration
const app = express();
const httpServer = createServer(app);
const ready = registerRoutes(httpServer, app);

export const api = functions.region("asia-southeast1").https.onRequest(async (req, res) => {
  await ready;
  return app(req, res);
});
