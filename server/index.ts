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
  // Use the standard middleware - it handles the OPTIONS/Preflight automatically
  app.use(cors({
    origin: ["http://localhost:8081", "https://amanship-production.up.railway.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  
  // Explicitly handle OPTIONS for Railway/Cloudfront edge cases
  app.options('*', (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.sendStatus(200);
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