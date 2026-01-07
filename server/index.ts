import "dotenv/config";
import express from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import cors from 'cors';

const app = express();
const log = console.log;

// Detect if we are running on Railway or locally
const isProd = process.env.NODE_ENV === "production" || !!process.env.RAILWAY_ENVIRONMENT;

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:8081",
      "https://amanship-production.up.railway.app"
    ];

    const isExpoTunnel = origin?.endsWith('.exp.direct');

    if (origin && (allowedOrigins.includes(origin) || isExpoTunnel)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      // ✅ VERY IMPORTANT FOR WEB BROWSERS:
      res.setHeader("Vary", "Origin"); 
    } else if (!isProd) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: false }));
}

function configureStaticFiles(app: express.Application) {
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  const assetsPath = path.resolve(process.cwd(), "assets");

  app.use("/uploads", express.static(uploadsPath));
  app.use("/assets", express.static(assetsPath));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

(async () => {
  // 1. Setup CORS before any routes or other middleware
  setupCors(app);
  
  // 2. Setup parsing and static files
  setupBodyParsing(app);
  configureStaticFiles(app);

  // 3. Register routes (IMPORTANT: Ensure routes.ts has NO internal CORS logic now)
  const server = await registerRoutes(app);

  const port = parseInt(process.env.PORT || "5000", 10);

  // Ensure upload directories exist
  const chatDir = path.join(process.cwd(), "uploads", "chat");
  if (!fs.existsSync(chatDir)) {
    fs.mkdirSync(chatDir, { recursive: true });
  }

  // Start server on 0.0.0.0
  server.listen(port, "0.0.0.0", () => {
    const mode = isProd ? "PRODUCTION 🚀" : "DEVELOPMENT 🛠️";
    log(`-----------------------------------------`);
    log(`STATUS: ${mode}`);
    log(`PORT:   ${port}`);
    if (!isProd) {
      log(`LOCAL:  http://localhost:${port}`);
    } else {
      log(`CLOUD:  https://amanship-production.up.railway.app`);
    }
    log(`-----------------------------------------`);
  });
})();