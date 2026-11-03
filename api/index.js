import { createApp } from '../server/src/app.js'
import { connectDatabase } from '../server/src/config/database.js'

let appInstance = null

export default async function handler(req, res) {
  // Lazily instantiate Express app
  if (!appInstance) {
    appInstance = createApp()
  }

  // Ensure MongoDB connection is initialized / cached for serverless invocation
  try {
    await connectDatabase()
  } catch (error) {
    console.error('[serverless] Database initialization notice:', error.message)
  }

  // Delegate request directly to Express
  return appInstance(req, res)
}

