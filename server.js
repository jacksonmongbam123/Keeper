import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import cluster from "cluster";
import compression from "compression";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// High-performance concurrency: utilize multi-core clustering
if (process.env.NODE_ENV === "production" && cluster.isPrimary) {
  const numCPUs = os.cpus().length || 4;
  console.log(`[Primary Process] Spawning ${numCPUs} worker processes to handle high traffic concurrently...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.warn(`[Worker Process ${worker.process.pid}] exited with code: ${code}, signal: ${signal}. Spawning replacement worker...`);
    cluster.fork();
  });
} else {
  const app = express();

  // 1. High-Performance Rate Limiter: Prevent server exhaustion during 100k spike traffic
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 1000, // limit each IP to 1000 requests per minute
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      status: 429,
      error: "Too many requests from this IP, please try again shortly."
    }
  });
  app.use(limiter);

  // 2. HTTP Payload Gzip Compression: Minimizes transfer overhead, reducing bandwidth and TTFB under massive load
  app.use(compression({
    level: 6, // optimal CPU-compression ratio trade-off
    threshold: 1024, // compress responses over 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // 3. Request parsing limits to prevent Memory Overload under 100k user payloads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 4. Custom security & caching headers
  app.use((req, res, next) => {
    // Disable server header
    res.removeHeader("X-Powered-By");
    // Standard secure response headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // 5. Optimized Static File Serving with aggressive CDN/browser caching
  // Since Vite static files contain a unique content hash, we can cache them for 1 year.
  const staticCacheOptions = {
    maxAge: "31536000s", // 1 Year in seconds
    immutable: true, // Content never changes, bypasses validation
    etag: true, // Keep ETags for conditional requests
    lastModified: true,
    setHeaders: (res, filePath) => {
      // If it's an HTML file (like index.html), do not cache indefinitely
      if (filePath.endsWith(".html") || filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  };

  app.use(express.static(path.join(__dirname, "dist"), staticCacheOptions));

  // 6. High-Performance Health Endpoint
  app.get("/api/healthz", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.status(200).json({
      status: "healthy",
      timestamp: Date.now(),
      pid: process.pid,
      uptime: process.uptime()
    });
  });

  // 7. Wildcard Route (SPA routing)
  app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });

  // 8. Start HTTP server and tune connection keep-alive for reverse proxy integrations
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Worker Process ${process.pid}] online & serving high-volume traffic on port ${PORT}`);
  });

  // Tuning keep-alive to match high load-balancer timeouts, preventing connection reset race conditions
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds

  // 9. Graceful Shutdown Management
  const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}. Gracefully terminating active connection pools...`);
    server.close(() => {
      console.log("HTTP server closed. Exiting process.");
      process.exit(0);
    });

    // Enforce shutdown after 10 seconds to avoid zombie processes
    setTimeout(() => {
      console.error("Forced exit due to open connections that failed to close in time.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
