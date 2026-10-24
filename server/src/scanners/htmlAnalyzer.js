import { load } from 'cheerio'

/**
 * Extract page structure and metadata with Cheerio.
 * The input is untrusted HTML: nothing here executes scripts or follows links.
 */

const MAX_LINKS = 200
const MAX_RESOURCES = 150
const MAX_HEADINGS = 40

function cleanText(value, max = 300) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function resolveUrl(raw, baseUrl) {
  if (!raw) return null
  try {
    const url = new URL(String(raw).trim(), baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

function sameHost(a, b) {
  try {
    return new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '')
  } catch {
    return false
  }
}

export function analyzeHtml(html, pageUrl) {
  if (typeof html !== 'string' || html.length === 0) {
    return null
  }

  const $ = load(html)
  const baseUrl = pageUrl

  const title = cleanText($('title').first().text(), 300)
  const metaDescription = cleanText($('meta[name="description"]').attr('content'), 500)
  const metaRobots = cleanText($('meta[name="robots"]').attr('content'), 200)
  const metaRefresh = cleanText($('meta[http-equiv="refresh"]').attr('content'), 200)
  const generator = cleanText($('meta[name="generator"]').attr('content'), 200)
  const lang = cleanText($('html').attr('lang'), 35)
  const viewport = cleanText($('meta[name="viewport"]').attr('content'), 200)
  const charset = cleanText($('meta[charset]').attr('charset'), 40)
  const canonical = resolveUrl($('link[rel="canonical"]').first().attr('href'), baseUrl)
  const favicon = resolveUrl(
    $('link[rel~="icon"]').first().attr('href') || $('link[rel="shortcut icon"]').first().attr('href'),
    baseUrl,
  )

  const ogTitle = cleanText($('meta[property="og:title"]').attr('content'), 300)
  const ogDescription = cleanText($('meta[property="og:description"]').attr('content'), 300)
  const twitterCard = cleanText($('meta[name="twitter:card"]').attr('content'), 60)

  // Headings
  const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 }
  const headings = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = (el.tagName || '').toLowerCase()
    if (headingCounts[level] !== undefined) headingCounts[level] += 1
    if (headings.length < MAX_HEADINGS) {
      const text = cleanText($(el).text(), 160)
      if (text) headings.push({ level, text })
    }
  })

  // Images
  const images = $('img')
  let imagesMissingAlt = 0
  const missingAltExamples = []
  const imageUrls = []
  images.each((_, el) => {
    const alt = $(el).attr('alt')
    const src = resolveUrl($(el).attr('src'), baseUrl)
    if (src && imageUrls.length < MAX_RESOURCES) imageUrls.push(src)
    if (alt === undefined || alt.trim() === '') {
      imagesMissingAlt += 1
      if (missingAltExamples.length < 5 && src) missingAltExamples.push(src)
    }
  })

  // Scripts and stylesheets
  const scriptUrls = []
  let inlineScriptCount = 0
  let inlineScriptBytes = 0
  $('script').each((_, el) => {
    const src = resolveUrl($(el).attr('src'), baseUrl)
    if (src) {
      if (scriptUrls.length < MAX_RESOURCES) scriptUrls.push(src)
    } else {
      inlineScriptCount += 1
      inlineScriptBytes += Buffer.byteLength($(el).html() || '', 'utf8')
    }
  })

  const styleUrls = []
  const linkUrls = []
  $('link[href]').each((_, el) => {
    const href = resolveUrl($(el).attr('href'), baseUrl)
    if (!href) return
    if (linkUrls.length < MAX_RESOURCES) linkUrls.push(href)
    const rel = String($(el).attr('rel') || '').toLowerCase()
    if (rel.includes('stylesheet') && styleUrls.length < MAX_RESOURCES) styleUrls.push(href)
  })

  const inlineStyleCount = $('style').length

  // Links
  const internalLinks = new Set()
  const externalLinks = new Set()
  let totalLinks = 0
  $('a[href]').each((_, el) => {
    const href = resolveUrl($(el).attr('href'), baseUrl)
    if (!href) return
    totalLinks += 1
    if (sameHost(href, baseUrl)) {
      if (internalLinks.size < MAX_LINKS) internalLinks.add(href)
    } else if (externalLinks.size < MAX_LINKS) {
      externalLinks.add(href)
    }
  })

  // Iframes, forms, mixed-content candidates
  const iframeUrls = []
  $('iframe[src]').each((_, el) => {
    const src = resolveUrl($(el).attr('src'), baseUrl)
    if (src && iframeUrls.length < 20) iframeUrls.push(src)
  })

  let formCount = 0
  let insecureFormActions = 0
  $('form').each((_, el) => {
    formCount += 1
    const action = $(el).attr('action')
    if (action && /^http:\/\//i.test(action)) insecureFormActions += 1
  })

  const mixedContentCandidates = [...scriptUrls, ...styleUrls, ...imageUrls, ...iframeUrls].filter((url) =>
    url.startsWith('http://'),
  )
  const pageIsHttps = baseUrl.startsWith('https://')

  const headingStructure = {
    counts: headingCounts,
    total: Object.values(headingCounts).reduce((sum, count) => sum + count, 0),
    outline: headings,
  }

  return {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    canonicalMatchesPage: canonical ? sameHost(canonical, baseUrl) : null,
    lang,
    viewport,
    charset,
    generator,
    metaRobots,
    metaRefresh,
    favicon,
    social: {
      ogTitle,
      ogDescription,
      twitterCard,
    },
    headingStructure,
    images: {
      total: images.length,
      missingAlt: imagesMissingAlt,
      missingAltExamples,
    },
    scripts: {
      total: $('script').length,
      externalCount: scriptUrls.length,
      inlineCount: inlineScriptCount,
      inlineBytes: inlineScriptBytes,
      // Bounded list of asset URLs used for fingerprinting and reporting.
      sources: scriptUrls.slice(0, 100),
    },
    styles: {
      externalCount: styleUrls.length,
      inlineCount: inlineStyleCount,
      sources: styleUrls.slice(0, 100),
    },
    links: {
      total: totalLinks,
      internalCount: internalLinks.size,
      externalCount: externalLinks.size,
      internalSamples: [...internalLinks].slice(0, 25),
      externalSamples: [...externalLinks].slice(0, 25),
      internal: [...internalLinks],
    },
    iframes: {
      count: $('iframe').length,
      sources: iframeUrls,
    },
    forms: {
      count: formCount,
      insecureActionCount: insecureFormActions,
    },
    assets: {
      allUrls: [...new Set([...scriptUrls, ...styleUrls, ...imageUrls, ...iframeUrls])].slice(0, MAX_RESOURCES),
    },
    mixedContent: {
      pageIsHttps,
      candidates: pageIsHttps ? [...new Set(mixedContentCandidates)].slice(0, 20) : [],
      count: pageIsHttps ? new Set(mixedContentCandidates).size : 0,
    },
  }
}
