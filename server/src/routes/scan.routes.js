import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { scanLimiter } from '../middleware/rateLimiter.js'
import {
  createScanController,
  deleteScanController,
  getScanController,
  listScansController,
} from '../controllers/scan.controller.js'

export const scanRouter = Router()

scanRouter.post('/', scanLimiter, asyncHandler(createScanController))
scanRouter.get('/', asyncHandler(listScansController))
scanRouter.delete('/:id', asyncHandler(deleteScanController))
scanRouter.get('/:id', asyncHandler(getScanController))
