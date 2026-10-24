import { Router } from 'express'
import { config } from '../config/env.js'
import { getDatabaseStatus, isDatabaseConnected } from '../config/database.js'
import { getScannerCapacity } from '../services/scan.service.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  const connected = isDatabaseConnected()
  res.json({
    success: true,
    data: {
      status: connected ? 'ok' : 'degraded',
      service: 'Site Scanner API',
      version: config.appVersion,
      database: {
        status: getDatabaseStatus(),
        connected,
      },
      scanner: getScannerCapacity(),
      browserChecksEnabled: config.browserScanEnabled,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  })
})
