import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { checkDatabaseHealth, prisma } from "./config/prisma";

// ============================================
// CONSTANTS
// ============================================
const PORT = env.PORT || 4000;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds
let server: ReturnType<typeof app.listen> | null = null;

// ============================================
// SERVER INFO
// ============================================
const getServerInfo = () => ({
  port: PORT,
  environment: env.NODE_ENV,
  url: `http://localhost:${PORT}`,
  apiUrl: `http://localhost:${PORT}/api`,
  healthUrl: `http://localhost:${PORT}/health`,
});

// ============================================
// BANNER
// ============================================
const displayBanner = (info: ReturnType<typeof getServerInfo>) => {
  const banner = [
    "╔═══════════════════════════════════════════════════════════════╗",
    "║                                                               ║",
    "║  🚀  Ranenla Backend Server                                  ║",
    "║                                                               ║",
    `║  Environment:  ${info.environment.padEnd(45)}║`,
    `║  Port:         ${info.port.toString().padEnd(45)}║`,
    `║  URL:          ${info.url.padEnd(45)}║`,
    `║  API:          ${info.apiUrl.padEnd(45)}║`,
    `║  Health:       ${info.healthUrl.padEnd(45)}║`,
    "║                                                               ║",
    "║  Press Ctrl+C to stop                                        ║",
    "║                                                               ║",
    "╚═══════════════════════════════════════════════════════════════╝",
  ];
  banner.forEach((line) => logger.info(line));
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    logger.warn("❌ Forced shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // 1. Close HTTP server
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          logger.info("✅ HTTP server closed");
          resolve();
        });
      });
      server = null;
    }

    // 2. Close database connections
    await prisma.$disconnect();
    logger.info("✅ Database connections closed");

    clearTimeout(timeout);
    logger.info("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "❌ Error during graceful shutdown");
    clearTimeout(timeout);
    process.exit(1);
  }
};

// ============================================
// ERROR HANDLERS
// ============================================
const setupProcessHandlers = () => {
  // Shutdown signals
  ["SIGTERM", "SIGINT", "SIGUSR2"].forEach((signal) => {
    process.on(signal, () => {
      void gracefulShutdown(signal);
    });
  });

  // Uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "💥 Uncaught Exception");
    void gracefulShutdown("uncaughtException");
  });

  // Unhandled rejections
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "💥 Unhandled Rejection");
    void gracefulShutdown("unhandledRejection");
  });
};

// ============================================
// START SERVER
// ============================================
const startServer = async (): Promise<void> => {
  try {
    // 1. Check database connection (informational only — a transient DB
    // outage at boot should not take down the whole process; /ready
    // reports live DB status per-request for that purpose).
    logger.info("🔍 Checking database connection...");
    const health = await checkDatabaseHealth();

    if (!health.isConnected) {
      logger.error({ error: health.error }, "⚠️  Database unreachable at startup — starting anyway");
      logger.error("💡 Please check your DATABASE_URL if this persists");
    } else {
      logger.info(`✅ Database connected${health.latency ? ` (${health.latency}ms)` : ""}`);
    }

    // 2. Start HTTP server
    server = app.listen(PORT, () => {
      displayBanner(getServerInfo());
    });

    // 3. Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.fatal(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
      logger.fatal({ error }, "❌ Server error");
      process.exit(1);
    });

    // 4. Setup process handlers
    setupProcessHandlers();

    logger.info("✅ Server startup complete");
  } catch (error) {
    logger.fatal({ error }, "❌ Failed to start server");
    process.exit(1);
  }
};

// ============================================
// EXPORTS & ENTRY POINT
// ============================================
export { server, startServer };

startServer();
