import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import routes from './routes'
import { errorHandler, notFound } from './middlewares/error.middleware'
import { logger } from './utils/logger'
import { env } from './config/env'

export const app: Express = express()

// Security
app.use(helmet())
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
})
app.use('/api', limiter)

// Parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(compression())

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }))
}

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug({
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }, 'Incoming request')
  next()
})

// Routes
app.use('/api', routes)

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  })
})

app.get('/ready', async (req: Request, res: Response) => {
  try {
    const { prisma } = await import('./config/prisma')
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      success: true,
      message: 'Server is ready',
      database: 'connected',
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server is not ready',
      database: 'disconnected',
    })
  }
})

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Ranenla API is running',
    version: '1.0.0',
    health: '/health',
  })
})

// Error handling
app.use(notFound)
app.use(errorHandler)

export default app