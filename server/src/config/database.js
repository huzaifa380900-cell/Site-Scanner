import mongoose from 'mongoose'
import { config } from './env.js'

/**
 * MongoDB Atlas connection management.
 * The API starts even when Atlas is unreachable, but reports the real state
 * and refuses to run scans that cannot be persisted.
 */

let reconnectTimer = null
let connectAttempts = 0

export async function connectDatabase() {
  if (!config.mongoUri) {
    console.error('[db] MONGODB_URI is not configured. Scan persistence is unavailable.')
    return false
  }

  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return mongoose.connection.readyState === 1
  }

  connectAttempts += 1
  try {
    mongoose.set('strictQuery', true)
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      autoIndex: !config.isProduction,
    })
    console.log(`[db] Connected to MongoDB (attempt ${connectAttempts})`)
    connectAttempts = 0
    return true
  } catch (error) {
    // Deliberately log the driver message only; credentials are never logged.
    console.error(`[db] MongoDB connection failed: ${error.message}`)
    scheduleReconnect()
    return false
  }
}

function scheduleReconnect() {
  if (reconnectTimer || config.isTest) return
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
  await mongoose.disconnect()
}
