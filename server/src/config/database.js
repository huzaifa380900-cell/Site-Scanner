import mongoose from 'mongoose'
import { config } from './env.js'

/**
 * MongoDB Atlas connection management with Serverless connection caching.
 *
 * In serverless environments (like Vercel), execution contexts are frozen and
 * reused across invocations. We cache the active connection promise globally so
 * repeated API invocations reuse the established TCP connection instead of creating
 * new pools or hitting connection limits.
 */

let cachedConnectionPromise = null
let reconnectTimer = null
let connectAttempts = 0

export async function connectDatabase() {
  if (!config.mongoUri) {
    if (config.isProduction) {
      console.warn('[db] MONGODB_URI is not configured. Database persistence is unavailable.')
    }
    return false
  }

  // Ready states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1) {
    return true
  }

  // If a connection attempt is already in progress, await the cached promise
  if (mongoose.connection.readyState === 2 && cachedConnectionPromise) {
    try {
      await cachedConnectionPromise
      return mongoose.connection.readyState === 1
    } catch {
      return false
    }
  }

  connectAttempts += 1
  try {
    mongoose.set('strictQuery', true)

    cachedConnectionPromise = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 15000,
      autoIndex: !config.isProduction,
      bufferCommands: false,
    })

    await cachedConnectionPromise
    console.log(`[db] Connected to MongoDB Atlas (attempt ${connectAttempts})`)
    connectAttempts = 0
    return true
  } catch (error) {
    cachedConnectionPromise = null
    // Deliberately log the driver message only; credentials are never logged.
    console.error(`[db] MongoDB connection failed: ${error.message}`)
    scheduleReconnect()
    return false
  }
}

function scheduleReconnect() {
  // In serverless/test environments, don't keep background timers unref'd or hanging
  if (reconnectTimer || config.isTest || process.env.VERCEL) return
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null
    await connectDatabase()
  }, 15000)
  reconnectTimer.unref?.()
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1
}

export function getDatabaseStatus() {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  return states[mongoose.connection.readyState] || 'unknown'
}

export async function disconnectDatabase() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  cachedConnectionPromise = null
  await mongoose.disconnect()
}
