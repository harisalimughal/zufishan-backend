import { app } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { checkDatabaseHealth } from './config/prisma'

const PORT = env.PORT || 4000
let server: ReturnType<typeof app.listen> | null = null

function getServerInfo() {
  return {
    port: PORT,
    environment: env.NODE_ENV,
    url: `http://localhost:${PORT}`,
    apiUrl: `http://localhost:${PORT}/api`,
    healthUrl: `http://localhost:${PORT}/health`,
  }
}

function displayBanner(info: any) {
  const lines = [
    '╔═══════════════════════════════════════════════════════════════╗',
    '║                                                               ║',
    '║  🚀  Ranenla Backend Server                                  ║',
    '║                                                               ║',
    `║  Environment:  ${info.environment.padEnd(45)}║`,
    `║  Port:         ${info.port.toString().padEnd(45)}║`,
    `║  URL:          ${info.url.padEnd(45)}║`,
    `║  API:          ${info.apiUrl.padEnd(45)}║`,
    `║  Health:       ${info.healthUrl.padEnd(45)}║`,
    '║                                                               ║',
    '║  Press Ctrl+C to stop                                        ║',
    '║                                                               ║',
    '╚═══════════════════════════════════════════════════════════════╝',
  ]
  lines.forEach((line) => logger.info(line))
}

async function gracefulShutdown(signal: string) {
  logger.info(`\nReceived ${signal}, starting graceful shutdown...`)
  const shutdownTimeout = setTimeout(() => {
    logger.warn('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)

  try {
    const { prisma } = await import('./config/prisma')
    await prisma.$disconnect()
    logger.info('✅ Database connections closed')

    if (server) {
      await new Promise((resolve) => {
        server!.close(() => {
          logger.info('✅ Server closed')
          resolve()
        })
      })
    }

    clearTimeout(shutdownTimeout)
    logger.info('✅ Graceful shutdown completed')
    process.exit(0)
  } catch (error) {
    logger.error({ error }, '❌ Error during graceful shutdown')
    clearTimeout(shutdownTimeout)
    process.exit(1)
  }
}

async function startServer() {
  try {
    logger.info('🔍 Checking database connection...')
    const health = await checkDatabaseHealth()

    if (!health.isConnected) {
      logger.error({ error: health.error }, '❌ Database connection failed')
      logger.error('💡 Please check your DATABASE_URL in .env file')
      process.exit(1)
    }
    logger.info(`✅ Database connected successfully${health.latency ? ` (${health.latency}ms)` : ''}`)

    server = app.listen(PORT, () => {
      const info = getServerInfo()
      displayBanner(info)
    })

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please use a different port.`)
        process.exit(1)
      } else {
        logger.error({ error }, 'Server error')
        process.exit(1)
      }
    })

    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const
    signals.forEach((signal) => {
      process.on(signal, () => gracefulShutdown(signal))
    })

    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught Exception')
      gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled Rejection')
      gracefulShutdown('unhandledRejection')
    })

    logger.info('✅ Server startup complete')
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server')
    process.exit(1)
  }
}

export { server, startServer }

if (require.main === module) {
  startServer()
}