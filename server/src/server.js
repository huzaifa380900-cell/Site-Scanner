import { createApp } from './app.js'
import { config } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'

const app = createApp()

const server = app.listen(config.port, () => {
  console.log(`[server] Site Scanner API listening on http://localhost:${config.port}`)
  console.log(`[server] Environment: ${config.nodeEnv}`)
  console.log(`[server] Allowed client origins: ${config.clientOrigins.join(', ') || '(none)'}`)
  console.log(`[server] Browser checks: ${config.browserScanEnabled ? 'enabled' : 'disabled'}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[server] Port ${config.port} is already in use. Set PORT in server/.env.`)
    process.exit(1)
  }
  console.error('[server] Failed to start:', error.message)
  process.exit(1)
})

// Connect to Atlas after the API is listening so /api/health can report the
// real connection state. Scans are refused while the database is unavailable.
connectDatabase()

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[server] ${signal} received; closing HTTP server and database connection.`)
  const forceExit = setTimeout(() => {
    console.error('[server] Graceful shutdown timed out; exiting.')
    process.exit(1)
  }, 10000)
  forceExit.unref()

  server.close(async () => {
    try {
      await disconnectDatabase()
    } catch {
      /* noop */
    }
    clearTimeout(forceExit)
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason instanceof Error ? reason.message : reason)
})

process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught exception:', error.message)
  process.exit(1)
})
