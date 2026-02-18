/**
 * server/routes/grabmapsTiles.ts
 * 
 * Tile proxy that:
 * 1. Keeps the GrabMaps API key server-side (never exposed to client)
 * 2. Caches tiles in-memory for 24 h to reduce quota consumption
 * 3. Falls back to Carto CDN if GrabMaps request fails
 * 
 * Mount with:
 *   import grabmapsTilesRouter from "./routes/grabmapsTiles";
 *   app.use("/api/grabmaps", grabmapsTilesRouter);
 */

import { Router, Request, Response } from "express";

const router = Router();

// ─── Simple in-memory tile cache ────────────────────────────────────────────
interface CacheEntry { data: Buffer; contentType: string; cachedAt: number }
const tileCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = parseInt(process.env.GRABMAPS_TILE_CACHE_TTL || "86400") * 1000; // default 24 h

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of tileCache) {
    if (now - entry.cachedAt > CACHE_TTL_MS) tileCache.delete(key);
  }
}

// Prune every 30 minutes
setInterval(pruneCache, 30 * 60 * 1000);

// ─── Fallback tile URL (Carto Voyager – no key required) ────────────────────
const CARTO_TILE = (z: string, x: string, y: string) =>
  `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

// ─── Main tile handler ───────────────────────────────────────────────────────
router.get("/tiles/:z/:x/:y.png", async (req: Request, res: Response) => {
  const { z, x, y } = req.params;
  const cacheKey = `${z}/${x}/${y}`;

  // Serve from cache if fresh
  const cached = tileCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    res.set("Content-Type", cached.contentType);
    res.set("X-Tile-Source", "cache");
    res.set("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
    return res.send(cached.data);
  }

  const apiKey = process.env.GRABMAPS_API_KEY;

  // ── Try GrabMaps ──────────────────────────────────────────────────────────
  if (apiKey) {
    try {
      const grabUrl = `https://tiles.grab.com/tiles/${z}/${x}/${y}.png?apiKey=${apiKey}`;
      const response = await fetch(grabUrl, {
        headers: {
          "User-Agent": "ZendOApp/1.0",
          "Accept":     "image/png,image/*",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const buffer      = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") || "image/png";

        // Cache it
        tileCache.set(cacheKey, { data: buffer, contentType, cachedAt: Date.now() });

        res.set("Content-Type", contentType);
        res.set("X-Tile-Source", "grabmaps");
        res.set("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
        return res.send(buffer);
      }
    } catch (err) {
      console.warn(`⚠️  GrabMaps tile ${cacheKey} failed – falling back to Carto`);
    }
  }

  // ── Fallback: Carto CDN ───────────────────────────────────────────────────
  try {
    const cartoUrl = CARTO_TILE(z, x, y);
    const response = await fetch(cartoUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const buffer      = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/png";

      tileCache.set(cacheKey, { data: buffer, contentType, cachedAt: Date.now() });

      res.set("Content-Type", contentType);
      res.set("X-Tile-Source", "carto-fallback");
      res.set("Cache-Control", "public, max-age=3600");
      return res.send(buffer);
    }
  } catch (err) {
    console.error(`❌ Carto fallback also failed for tile ${cacheKey}`);
  }

  // ── Both failed ───────────────────────────────────────────────────────────
  res.status(503).json({ error: "Tile unavailable" });
});

// ─── Cache stats endpoint (admin debug) ─────────────────────────────────────
router.get("/cache/stats", (_req: Request, res: Response) => {
  res.json({
    cachedTiles: tileCache.size,
    cacheTtlHours: CACHE_TTL_MS / 3_600_000,
    hasApiKey: !!process.env.GRABMAPS_API_KEY,
  });
});

export default router;