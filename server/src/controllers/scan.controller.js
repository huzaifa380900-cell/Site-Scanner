import { createHash } from 'node:crypto'
import { z } from 'zod'
import { AppError } from '../utils/errors.js'
import { createScan, deleteScanById, getScanById, listScans } from '../services/scan.service.js'

/**
 * Route controllers validate input, call the scan service and shape the API
 * response. No scanning or database logic lives here.
 */

const createScanSchema = z
  .object({
    url: z
      .string({ required_error: 'Enter a website URL to scan.' })
      .trim()
      .min(1, 'Enter a website URL to scan.')
      .max(2048, 'The URL is too long.'),
  })
  .strict()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})

function validationError(error) {
  return new AppError('VALIDATION_ERROR', 'The request could not be validated.', {
    statusCode: 400,
    details: error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  })
}

function getOwnerHash(req) {
  const parsed = z.string().uuid().safeParse(req.get('x-scanner-owner'))
  if (!parsed.success) {
    throw new AppError('OWNER_REQUIRED', 'The browser history identifier is missing or invalid.', {
      statusCode: 400,
    })
  }
  return createHash('sha256').update(parsed.data).digest('hex')
}

export async function createScanController(req, res, next) {
  try {
    const parsed = createScanSchema.safeParse(req.body)
    if (!parsed.success) throw validationError(parsed.error)

    const report = await createScan(parsed.data.url, {
      clientKey: req.ip || 'unknown',
      ownerHash: getOwnerHash(req),
    })
    res.status(201).json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
}

export async function listScansController(req, res, next) {
  try {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) throw validationError(parsed.error)

    const result = await listScans({ ...parsed.data, ownerHash: getOwnerHash(req) })
    res.json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

export async function getScanController(req, res, next) {
  try {
    const report = await getScanById(req.params.id, getOwnerHash(req))
    res.json({ success: true, data: report })
  } catch (error) {
    next(error)
  }
}

export async function deleteScanController(req, res, next) {
  try {
    await deleteScanById(req.params.id, getOwnerHash(req))
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    next(error)
  }
}
