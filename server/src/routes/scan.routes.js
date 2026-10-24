import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { scanLimiter } from '../middleware/rateLimiter.js'
import {
  createScanController,
  getScanController,
  listScansController,
} from '../controllers/scan.controller.js'

export const scanRouter = Router()

scanRouter.post('/', scanLimiter, asyncHandler(createScanController))
scanRouter.get('/', asyncHandler(listScansController))
scanRouter.get('/:id', asyncHandler(getScanController))

// DELETE /api/scans/:id is intentionally not implemented: without authenticated
// ownership it would allow arbitrary deletion of scan history.
