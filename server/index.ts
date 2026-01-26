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
  app.use(cors({
    origin: [
      "http://localhost:8081",
      "https://amanship-production.up.railway.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
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
  // ✅ 1. CORS MUST BE FIRST
  setupCors(app);
  
  // ✅ 2. Body parsing BEFORE routes
  setupBodyParsing(app);
  
  // ✅ 3. Static files
  configureStaticFiles(app);
  
  // ✅ 4. Register routes LAST
  const server = await registerRoutes(app);

  const port = parseInt(process.env.PORT || "5000", 10);

  // Ensure upload directories exist
  const chatDir = path.join(process.cwd(), "uploads", "chat");
  if (!fs.existsSync(chatDir)) {
    fs.mkdirSync(chatDir, { recursive: true });
  }

  // Start server
  server.listen(port, "0.0.0.0", () => {
    const mode = isProd ? "PRODUCTION 🚀" : "DEVELOPMENT 🛠️";
    log(`-----------------------------------------`);
    log(`STATUS: ${mode}`);
    log(`PORT:   ${port}`);
    log(
      isProd
        ? "CLOUD:  https://amanship-production.up.railway.app"
        : `LOCAL:  http://localhost:${port}`
    );
    log(`-----------------------------------------`);
  });
})();