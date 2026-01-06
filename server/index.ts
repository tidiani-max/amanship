import "dotenv/config";
import express from "express";
import { db } from "./db";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import os from "node:os"; // Fixed: Corrected the default import for os

const app = express();
const log = console.log;

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

function setupCors(app: express.Application) {
 app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  const allowedOrigins = isProd
    ? ["https://amanship-production.up.railway.app"]
    : [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://192.168.10.210:8081",
      ];

  const origin = req.headers.origin;

  if (
    origin &&
    (
      allowedOrigins.includes(origin) ||
      (!isProd && origin.includes("10.30."))
    )
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        // Using 'as any' here bypasses the strict check 
        // that causes the build to fail.
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    });
    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "KilatGo";
  } catch {
    return "KilatGo";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(process.cwd(), "static-build", platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

function serveLandingPage({ req, res, landingPageTemplate, appName }: { req: Request; res: Response; landingPageTemplate: string; appName: string; }) {
  const host = req.get("host") || "localhost:5000";
  const protocol = req.header("x-forwarded-proto") || req.protocol || "http";
  const baseUrl = `${protocol}://${host}`;
  
  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, host)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(process.cwd(), "server", "templates", "landing-page.html");
  const landingPageTemplate = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, "utf-8") : "<html><body>APP_NAME_PLACEHOLDER</body></html>";
  const appName = getAppName();

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    if (req.path !== "/" && req.path !== "/manifest") return next();

    const platform = req.header("expo-platform");
    if (platform === "ios" || platform === "android") return serveExpoManifest(platform, res);

    if (req.path === "/") {
      return serveLandingPage({ req, res, landingPageTemplate, appName });
    }
    next();
  });
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/images", express.static(path.resolve(process.cwd(), "attached_assets/stock_images")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

function setupErrorHandler(app: express.Application) {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);

  const server = await registerRoutes(app);
  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  if (!fs.existsSync("./uploads/chat")) {
  fs.mkdirSync("./uploads/chat", { recursive: true });
}
  
  // Listen on 0.0.0.0 so the server is reachable by your mobile device on the Wi-Fi
  server.listen(port, "0.0.0.0", () => {
    log(`-----------------------------------------`);
    log(`🚀 KilatGo Server started!`);
    log(`🔗 Localhost: http://localhost:${port}`);
    log(`📱 Network:   http://192.168.10.210:${port}`);
    log(`-----------------------------------------`);
  });
})();