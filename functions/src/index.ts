import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../../shared/server/routes";

// Build the Express app using existing route registration
const app = express();
const httpServer = createServer(app);
const ready = registerRoutes(httpServer, app);

// Export as a Gen 2 function (supports CPU/Memory config)
export const api = onRequest(
  { 
    region: "asia-southeast1",
    // maxInstances: 10, // Optional: ป้องกันค่าใช้จ่ายบานปลาย
  },
  async (req, res) => {
    await ready;
    return app(req, res);
  }
);
