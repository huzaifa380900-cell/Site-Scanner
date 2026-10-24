import mongoose from 'mongoose'

/**
 * Persisted scan report. Arrays are bounded by the scanner before saving, and
 * only public observations are stored (never cookies, credentials or internal
 * addresses).
 */

const findingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, maxlength: 300 },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], required: true },
    kind: {
      type: String,
      enum: ['observation', 'potential-issue', 'recommendation', 'inconclusive'],
      required: true,
    },
    category: { type: String, required: true, maxlength: 60 },
    description: { type: String, maxlength: 2000, default: '' },
    evidence: { type: String, maxlength: 4000, default: '' },
    recommendation: { type: String, maxlength: 2000, default: '' },
    affectedUrl: { type: String, maxlength: 2048, default: null },
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  },
  { _id: false },
)

const technologySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    category: {
      type: String,
      enum: ['frontend', 'cms', 'analytics', 'ui', 'cdn', 'server'],
      required: true,
    },
    description: { type: String, maxlength: 500, default: '' },
    evidence: [{ type: String, maxlength: 500 }],
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  },
  { _id: false },
)

const browserErrorSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['console', 'pageerror'], required: true },
    message: { type: String, maxlength: 1000, default: '' },
    url: { type: String, maxlength: 2048, default: '' },
    scope: { type: String, enum: ['same-origin', 'third-party', 'unknown'], default: 'unknown' },
  },
  { _id: false },
)

const failedResourceSchema = new mongoose.Schema(
  {
    url: { type: String, maxlength: 2048, default: '' },
    resourceType: { type: String, maxlength: 40, default: '' },
    errorText: { type: String, maxlength: 300, default: '' },
    scope: { type: String, enum: ['same-origin', 'third-party', 'unknown'], default: 'unknown' },
    blockedByPolicy: { type: Boolean, default: false },
  },
  { _id: false },
)

const redirectSchema = new mongoose.Schema(
  {
    from: { type: String, maxlength: 2048, default: '' },
    to: { type: String, maxlength: 2048, default: '' },
    statusCode: { type: Number, default: 0 },
  },
  { _id: false },
)

const scanReportSchema = new mongoose.Schema(
  {
    targetUrl: { type: String, required: true, maxlength: 2048 },
    hostname: { type: String, required: true, maxlength: 253, index: true },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed', required: true },
    httpStatus: { type: Number, default: null },
    durationMs: { type: Number, min: 0, default: 0 },
    observationScore: { type: Number, min: 0, max: 100, default: null },
    scoreMethod: { type: String, default: 'heuristic-v1' },
    findingCount: { type: Number, min: 0, default: 0 },
    severityCounts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    findings: { type: [findingSchema], default: [] },
    technologies: { type: [technologySchema], default: [] },
    browserErrors: { type: [browserErrorSchema], default: [] },
    failedResources: { type: [failedResourceSchema], default: [] },
    pageMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    httpHeaders: { type: mongoose.Schema.Types.Mixed, default: {} },
    redirects: { type: [redirectSchema], default: [] },
    security: { type: mongoose.Schema.Types.Mixed, default: {} },
    browser: { type: mongoose.Schema.Types.Mixed, default: null },
    errorSummary: { type: String, maxlength: 1000, default: null },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = String(ret._id)
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

// Recent-history listing and per-host lookups.
scanReportSchema.index({ createdAt: -1 })
scanReportSchema.index({ hostname: 1, createdAt: -1 })

scanReportSchema.pre('validate', function syncFindingCounts(next) {
  if (Array.isArray(this.findings)) {
    this.findingCount = this.findings.length
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    for (const item of this.findings) {
      if (counts[item.severity] !== undefined) counts[item.severity] += 1
    }
    this.severityCounts = counts
  }
  next()
})

export const ScanReport = mongoose.model('ScanReport', scanReportSchema)
