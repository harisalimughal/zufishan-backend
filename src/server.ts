import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { checkDatabaseHealth } from "./config/prisma";
import { PrismaClient } from "@prisma/client";

// ============================================
// CONSTANTS
// ============================================
const PORT = env.PORT || 4000;
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds
let server: ReturnType<typeof app.listen> | null = null;
let prismaInstance: PrismaClient | null = null;

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
    // 1. Close database connections
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      logger.info("✅ Database connections closed");
    }

    // 2. Close HTTP server
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          logger.info("✅ HTTP server closed");
          resolve();
        });
      });
    }

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
    process.on(signal, () => gracefulShutdown(signal));
  });

  // Uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "💥 Uncaught Exception");
    gracefulShutdown("uncaughtException");
  });

  // Unhandled rejections
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "💥 Unhandled Rejection");
    gracefulShutdown("unhandledRejection");
  });
};

// ============================================
// START SERVER
// ============================================
const startServer = async (): Promise<void> => {
  try {
    // 1. Check database connection
    logger.info("🔍 Checking database connection...");
    const health = await checkDatabaseHealth();

    if (!health.isConnected) {
      logger.error({ error: health.error }, "❌ Database connection failed");
      logger.error("💡 Please check your DATABASE_URL in .env file");
      process.exit(1);
    }

    // Store prisma instance for shutdown
    const { prisma } = await import("./config/prisma");
    prismaInstance = prisma;

    logger.info(`✅ Database connected${health.latency ? ` (${health.latency}ms)` : ""}`);

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
