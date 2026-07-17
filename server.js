require("dotenv").config();
const express = require("express");
const path = require("path");
const os = require("os");
const cluster = require("cluster");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const http = require("http");

const PORT = 3000;

// High-performance concurrency: utilize multi-core clustering in production if explicitly enabled (disabled by default on resource-constrained container platforms like Render to prevent OOM and socket polling handshake mismatches)
const useCluster = process.env.NODE_ENV === "production" && process.env.ENABLE_CLUSTER === "true";

if (useCluster && cluster.isPrimary) {
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
  app.set("trust proxy", 1);

  const fs = require("fs");

  // Load backend configurations dynamically
  let dbConnected = false;
  if (fs.existsSync(path.join(__dirname, 'config/config.js')) || fs.existsSync(path.join(__dirname, 'config/config.json'))) {
    try {
      const configs = require('./config/config');
      const constants = require("./utils/constants");
      const mongoose = require("mongoose");
      
      const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || (configs.MONGO_URI + "/" + constants.MONGO_DB_NAME);
      console.log("Connecting to MongoDB database...");
      mongoose.set("bufferCommands", false);
      mongoose
        .connect(mongoURI)
        .then(() => {
            console.log("MongoDB database connection established successfully!");
            dbConnected = true;
        })
        .catch(err => {
            console.error("MongoDB connection error:", err.message);
        });
    } catch (e) {
      console.warn("[Keeper] Optional database initialization skipped:", e.message);
    }
  } else {
    console.log("[Keeper] Standalone mode: Config files not present. Skipping database initialization.");
  }

  // 1. High-Performance Rate Limiter: Prevent server exhaustion
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 2000, // relaxed limit to accommodate local testing/API usage
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      error: "Too many requests from this IP, please try again shortly."
    }
  });
  app.use(limiter);

  // 2. HTTP Payload Gzip Compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // 3. Custom Busboy, CORS, and Payload Limiters
  const busboy = require('connect-busboy');
  const cors = require("cors");
  app.use(busboy());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 4. Custom security & caching headers
  app.use((req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN"); // Allow preview iframe in AI Studio
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // 5. Mount API routes conditionally
  if (fs.existsSync(path.join(__dirname, "routes"))) {
    try {
      const loginRoute = require("./routes/login_route");
      const classRoutes = require("./routes/class_management_routes");
      const homeworkRoutes = require("./routes/homework_routes");
      const timetableRoutes = require("./routes/timetable_routes");
      const dfRoutes = require("./routes/df/df_routes");
      const mRoutes = require("./routes/m/m_routes");
      const relRoutes = require("./routes/rel/rel_routes");

      app.use("/login", loginRoute);
      app.use("/class", classRoutes);
      app.use("/homework", homeworkRoutes);
      app.use("/timetable", timetableRoutes);
      app.use("/df", dfRoutes);
      app.use("/m", mRoutes);
      app.use("/rel", relRoutes);
      app.use("/rel_teacher_qualifications", require("./routes/rel/teacher_qualification_routes"));
      console.log("[Keeper Full-Stack] Successfully mounted backend API routes.");
    } catch (e) {
      console.warn("[Keeper] Standalone mode: Skipping backend API routes mounting.", e.message);
    }
  }

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

  // 7. Database offline graceful recovery middleware
  app.use((err, req, res, next) => {
    if (err && (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || err.message?.includes('buffering timed out'))) {
      console.warn('[AI Studio] Database offline or error — returning mock fallback response');
      if (req.method === 'GET') {
        return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      }
      return res.status(503).json({ error: 'Service temporarily unavailable (database connection error)' });
    }
    next(err);
  });

  // 8. Serve Frontend (Vite dev server middleware or built static production build)
  const staticCacheOptions = {
    maxAge: "31536000s",
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html") || filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  };

  // Start wrapping in HTTP Server for Socket.io integration
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  const io = require("socket.io")(httpServer);
  if (fs.existsSync(path.join(__dirname, "utils/socket_events.js"))) {
    try {
      const socketEvents = require("./utils/socket_events");
      io.on(socketEvents.CONNECT, async (socket) => {
        try {
          if (fs.existsSync(path.join(__dirname, 'sockets/chatMessage.js'))) {
            require('./sockets/chatMessage')(io, socket);
          }
        } catch (socketErr) {
          console.error("Socket chatMessage init error:", socketErr);
        }
      });
    } catch (e) {
      console.warn("[Keeper] Optional socket setup skipped:", e.message);
    }
  }

  // Start Vite dev server asynchronously in CommonJS
  async function setupFrontend() {
    if (process.env.NODE_ENV !== "production") {
      // Development: Integrate Vite Dev Server Middleware
      console.log("Configuring Vite Development Middleware...");
      const { createServer: createViteServer } = require("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== "true",
          watch: process.env.DISABLE_HMR === "true" ? null : {}
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // Production: Serve the compiled static assets
      console.log("Serving static production build from /dist...");
      app.use(express.static(path.join(__dirname, "dist"), staticCacheOptions));
      app.get("*", (req, res) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      });
    }

    // Start server listening
    const server = httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`[Keeper Server] Online & serving on port ${PORT} (PID: ${process.pid})`);
    });

    // Tune connection keep-alive for reverse proxy integration
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Graceful Shutdown Management
    const gracefulShutdown = (signal) => {
      console.log(`Received ${signal}. Gracefully terminating active connection pools...`);
      server.close(() => {
        console.log("HTTP server closed. Exiting process.");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forced exit due to open connections that failed to close in time.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  }

  setupFrontend().catch(err => {
    console.error("Failed to set up frontend middleware:", err);
    process.exit(1);
  });
}
