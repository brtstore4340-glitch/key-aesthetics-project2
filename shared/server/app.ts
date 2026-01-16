import "dotenv/config";
import express, { type Express, type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { registerRoutes, seedDatabase } from "./routes";
import { serveStatic } from "./static";

export interface BuildOptions {
  withStatic?: boolean;
  withVite?: boolean;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function createApp(
  options: BuildOptions = {},
): Promise<{ app: Express; httpServer: Server }> {
  const {
    withStatic = process.env.NODE_ENV === "production",
    withVite = process.env.NODE_ENV !== "production",
  } = options;

  const app = express();
  const httpServer = createServer(app);

  declare module "http" {
    interface IncomingMessage {
      rawBody: unknown;
    }
  }

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  // Seed database in dev/server mode
  await seedDatabase().catch((err) =>
    console.error("Error seeding database:", err),
  );

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (withStatic) {
    serveStatic(app);
  } else if (withVite) {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  return { app, httpServer };
}

