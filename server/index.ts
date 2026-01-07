import "dotenv/config";
import express from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

// Detect if we are running on Railway or locally
const isProd = process.env.NODE_ENV === "production" || !!process.env.RAILWAY_ENVIRONMENT;



function setupBodyParsing(app: express.Application) {
  app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: false }));
}

function configureStaticFiles(app: express.Application) {
  // Use absolute paths to ensure Railway Volumes work correctly
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  const assetsPath = path.resolve(process.cwd(), "assets");

  app.use("/uploads", express.static(uploadsPath));
  app.use("/assets", express.static(assetsPath));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

(async () => {
  
  setupBodyParsing(app);
  configureStaticFiles(app);

  const server = await registerRoutes(app);

  // 1. Get port from Railway's environment variable
  const port = parseInt(process.env.PORT || "5000", 10);

  // 2. Ensure upload directories exist (Persistent via Volumes)
  const chatDir = path.join(process.cwd(), "uploads", "chat");
  if (!fs.existsSync(chatDir)) {
    fs.mkdirSync(chatDir, { recursive: true });
  }

  // 3. Start server on 0.0.0.0 (required for Railway and external access)
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