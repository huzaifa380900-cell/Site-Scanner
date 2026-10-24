/**
 * Maintainable technology fingerprint registry.
 *
 * Every entry is passive evidence only: response headers, meta tags, asset
 * URLs, inline markers and link references. Server-side frameworks, databases
 * or hidden services are never inferred without public evidence.
 *
 * signal.source:
 *   - header     : response header (value tested)
 *   - generator  : <meta name="generator">
 *   - html       : raw HTML (substring or regexp)
 *   - script     : external script URL
 *   - style      : stylesheet URL
 *   - link       : any <link href> URL
 */

const FINGERPRINTS = [
  // ---------------------------------------------------------------- frontend
  {
    name: 'React',
    category: 'frontend',
    description: 'JavaScript UI library for component-driven interfaces.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /(^|[/@._-])react(-dom)?([.@/_-]|$)/i, evidence: 'React runtime script' },
      { source: 'html', match: 'data-reactroot', evidence: 'HTML contains data-reactroot' },
      { source: 'html', match: '__react_devtools_global_hook__', evidence: 'React DevTools hook present' },
    ],
  },
  {
    name: 'Vue.js',
    category: 'frontend',
    description: 'Progressive JavaScript framework for user interfaces.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /(^|[/@._-])vue(\.runtime)?([.@/_-]|$)/i, evidence: 'Vue runtime script' },
      { source: 'html', match: /data-v-[0-9a-f]{6,8}/i, evidence: 'Scoped Vue component attributes (data-v-*)' },
      { source: 'html', match: '__vue__', evidence: 'Vue root marker present' },
    ],
  },
  {
    name: 'Angular',
    category: 'frontend',
    description: 'TypeScript-based application framework by Google.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /(^|[/@._-])angular([.@/_-]|$)/i, evidence: 'Angular runtime script' },
      { source: 'html', match: /ng-version=/i, evidence: 'ng-version attribute on app root' },
    ],
  },
  {
    name: 'Svelte',
    category: 'frontend',
    description: 'Compile-time UI framework that ships small runtime bundles.',
    confidence: 'medium',
    signals: [
      { source: 'html', match: /class="[^"]*\bsvelte-[a-z0-9]+/i, evidence: 'Svelte scoped class names' },
      { source: 'script', match: /(^|[/@._-])svelte([.@/_-]|$)/i, evidence: 'Svelte runtime asset' },
    ],
  },
  {
    name: 'Next.js',
    category: 'frontend',
    description: 'React framework with server rendering and file-based routing.',
    confidence: 'high',
    signals: [
      { source: 'html', match: '__NEXT_DATA__', evidence: '__NEXT_DATA__ bootstrap payload' },
      { source: 'script', match: /\/_next\//i, evidence: '/_next/ asset path' },
      { source: 'header', header: 'x-nextjs-cache', evidence: 'x-nextjs-cache response header' },
    ],
  },
  {
    name: 'Nuxt',
    category: 'frontend',
    description: 'Vue framework for server-rendered and static applications.',
    confidence: 'high',
    signals: [
      { source: 'html', match: '__NUXT__', evidence: '__NUXT__ bootstrap payload' },
      { source: 'script', match: /\/_nuxt\//i, evidence: '/_nuxt/ asset path' },
    ],
  },
  {
    name: 'SvelteKit',
    category: 'frontend',
    description: 'Svelte application framework with routing and SSR.',
    confidence: 'medium',
    signals: [
      { source: 'html', match: '__sveltekit', evidence: 'SvelteKit bootstrap marker' },
      { source: 'script', match: /\/_app\/immutable\//i, evidence: '/_app/immutable/ asset path' },
    ],
  },
  {
    name: 'Astro',
    category: 'frontend',
    description: 'Content-focused framework that ships minimal JavaScript.',
    confidence: 'high',
    signals: [
      { source: 'html', match: 'astro-island', evidence: 'astro-island component marker' },
      { source: 'script', match: /\/_astro\//i, evidence: '/_astro/ asset path' },
    ],
  },
  {
    name: 'Gatsby',
    category: 'frontend',
    description: 'React-based static site generator.',
    confidence: 'medium',
    signals: [
      { source: 'html', match: '___gatsby', evidence: 'Gatsby root element' },
      { source: 'script', match: /gatsby-/i, evidence: 'Gatsby runtime bundle' },
    ],
  },
  {
    name: 'jQuery',
    category: 'frontend',
    description: 'Classic JavaScript DOM and utility library.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /(^|[/@._-])jquery([.-]?\d|[/@._-]|$)/i, evidence: 'jQuery script' },
      { source: 'html', match: 'jquery.min.js', evidence: 'jQuery asset reference' },
    ],
  },
  {
    name: 'Alpine.js',
    category: 'frontend',
    description: 'Lightweight declarative JavaScript behaviour library.',
    confidence: 'medium',
    signals: [
      { source: 'script', match: /(^|[/@._-])alpine(\.min)?\.js/i, evidence: 'Alpine.js script' },
      { source: 'html', match: /x-data="/i, evidence: 'Alpine x-data attribute' },
    ],
  },
  {
    name: 'htmx',
    category: 'frontend',
    description: 'Library that adds AJAX behaviour through HTML attributes.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /htmx(\.min)?\.js/i, evidence: 'htmx script' },
      { source: 'html', match: /hx-(get|post|put|delete)=/i, evidence: 'htmx request attributes' },
    ],
  },
  {
    name: 'Ember.js',
    category: 'frontend',
    description: 'Opinionated JavaScript application framework.',
    confidence: 'medium',
    signals: [
      { source: 'script', match: /ember(-[0-9a-f]+)?(\.min)?\.js/i, evidence: 'Ember.js runtime' },
      { source: 'html', match: /ember-view/i, evidence: 'Ember view class' },
    ],
  },

  // -------------------------------------------------------------------- UI
  {
    name: 'Bootstrap',
    category: 'ui',
    description: 'CSS component and grid framework.',
    confidence: 'high',
    signals: [
      { source: 'style', match: /bootstrap(\.min)?\.css/i, evidence: 'Bootstrap stylesheet' },
      { source: 'script', match: /bootstrap(\.bundle)?(\.min)?\.js/i, evidence: 'Bootstrap JavaScript' },
    ],
  },
  {
    name: 'Tailwind CSS',
    category: 'ui',
    description: 'Utility-first CSS framework.',
    confidence: 'medium',
    signals: [
      { source: 'style', match: /tailwind/i, evidence: 'Tailwind stylesheet reference' },
      { source: 'html', match: 'tailwindcss', evidence: 'Tailwind marker in HTML' },
    ],
  },
  {
    name: 'Font Awesome',
    category: 'ui',
    description: 'Icon font and SVG icon toolkit.',
    confidence: 'high',
    signals: [
      { source: 'style', match: /font-?awesome/i, evidence: 'Font Awesome stylesheet' },
      { source: 'script', match: /font-?awesome/i, evidence: 'Font Awesome script' },
    ],
  },
  {
    name: 'Material Icons',
    category: 'ui',
    description: 'Google Material icon set.',
    confidence: 'medium',
    signals: [{ source: 'style', match: /material[-_]?icons|fonts\.googleapis\.com\/icon/i, evidence: 'Material icon stylesheet' }],
  },
  {
    name: 'Bulma',
    category: 'ui',
    description: 'Flexbox-based CSS framework.',
    confidence: 'high',
    signals: [{ source: 'style', match: /bulma(\.min)?\.css/i, evidence: 'Bulma stylesheet' }],
  },
  {
    name: 'DaisyUI',
    category: 'ui',
    description: 'Component classes for Tailwind CSS.',
    confidence: 'low',
    signals: [{ source: 'style', match: /daisyui/i, evidence: 'daisyUI stylesheet reference' }],
  },

  // ------------------------------------------------------------------- CMS
  {
    name: 'WordPress',
    category: 'cms',
    description: 'PHP-based content management system.',
    confidence: 'high',
    signals: [
      { source: 'generator', match: /wordpress/i, evidence: 'generator meta tag' },
      { source: 'html', match: /\/wp-content\//i, evidence: '/wp-content/ asset path' },
      { source: 'html', match: /\/wp-includes\//i, evidence: '/wp-includes/ asset path' },
    ],
  },
  {
    name: 'Drupal',
    category: 'cms',
    description: 'PHP-based enterprise content management system.',
    confidence: 'high',
    signals: [
      { source: 'generator', match: /drupal/i, evidence: 'generator meta tag' },
      { source: 'html', match: /drupal-settings-json|sites\/default\/files/i, evidence: 'Drupal asset or settings marker' },
      { source: 'header', header: 'x-generator', match: /drupal/i, evidence: 'x-generator header' },
    ],
  },
  {
    name: 'MediaWiki',
    category: 'cms',
    description: 'Open-source wiki platform used by Wikipedia and many knowledge bases.',
    confidence: 'high',
    signals: [
      { source: 'generator', match: /mediawiki/i, evidence: 'generator meta tag' },
      { source: 'html', match: /\/w\/load\.php/i, evidence: '/w/load.php asset path' },
      { source: 'html', match: /mw-content-text|mediawiki/i, evidence: 'MediaWiki content marker' },
    ],
  },
  {
    name: 'Joomla',
    category: 'cms',
    description: 'PHP-based content management system.',
    confidence: 'high',
    signals: [
      { source: 'generator', match: /joomla/i, evidence: 'generator meta tag' },
      { source: 'html', match: /\/media\/jui\//i, evidence: '/media/jui/ asset path' },
    ],
  },
  {
    name: 'Shopify',
    category: 'cms',
    description: 'Hosted e-commerce platform.',
    confidence: 'high',
    signals: [
      { source: 'html', match: /cdn\.shopify\.com/i, evidence: 'Shopify CDN asset' },
      { source: 'html', match: /shopify\.theme/i, evidence: 'Shopify theme object' },
      { source: 'header', header: 'x-shopid', evidence: 'x-shopid response header' },
    ],
  },
  {
    name: 'Wix',
    category: 'cms',
    description: 'Hosted website builder.',
    confidence: 'high',
    signals: [
      { source: 'html', match: /wixstatic\.com|wix\.com/i, evidence: 'Wix asset host' },
      { source: 'header', header: 'x-wix-request-id', evidence: 'x-wix-request-id response header' },
    ],
  },
  {
    name: 'Squarespace',
    category: 'cms',
    description: 'Hosted website builder and CMS.',
    confidence: 'high',
    signals: [
      { source: 'html', match: /squarespace/i, evidence: 'Squarespace asset or metadata' },
      { source: 'header', header: 'x-servedby', match: /squarespace/i, evidence: 'Squarespace serving header' },
    ],
  },
  {
    name: 'Ghost',
    category: 'cms',
    description: 'Node.js publishing platform.',
    confidence: 'high',
    signals: [
      { source: 'generator', match: /ghost/i, evidence: 'generator meta tag' },
      { source: 'html', match: /ghost-url|ghost\.org/i, evidence: 'Ghost metadata marker' },
    ],
  },
  {
    name: 'Webflow',
    category: 'cms',
    description: 'Hosted visual website builder.',
    confidence: 'high',
    signals: [
      { source: 'html', match: /webflow\.(js|css)|webflow\.com/i, evidence: 'Webflow asset reference' },
      { source: 'generator', match: /webflow/i, evidence: 'generator meta tag' },
    ],
  },
  {
    name: 'Magento',
    category: 'cms',
    description: 'E-commerce platform (Adobe Commerce).',
    confidence: 'medium',
    signals: [
      { source: 'html', match: /magento/i, evidence: 'Magento marker in HTML' },
      { source: 'html', match: /\/skin\/frontend\//i, evidence: 'Magento skin asset path' },
    ],
  },
  {
    name: 'PrestaShop',
    category: 'cms',
    description: 'Open-source e-commerce platform.',
    confidence: 'medium',
    signals: [
      { source: 'generator', match: /prestashop/i, evidence: 'generator meta tag' },
      { source: 'html', match: /prestashop/i, evidence: 'PrestaShop marker in HTML' },
    ],
  },

  // ------------------------------------------------------------- analytics
  {
    name: 'Google Analytics',
    category: 'analytics',
    description: 'Web traffic measurement by Google.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /googletagmanager\.com\/gtag\/js/i, evidence: 'gtag.js (GA4) script' },
      { source: 'script', match: /google-analytics\.com\/(analytics|ga)\.js/i, evidence: 'Universal Analytics script' },
      { source: 'html', match: /gtag\('config'/i, evidence: 'gtag config call' },
    ],
  },
  {
    name: 'Google Tag Manager',
    category: 'analytics',
    description: 'Tag management container by Google.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /googletagmanager\.com\/gtm\.js/i, evidence: 'GTM container script' },
      { source: 'html', match: /GTM-[A-Z0-9]{4,}/, evidence: 'GTM container ID' },
    ],
  },
  {
    name: 'Meta Pixel',
    category: 'analytics',
    description: 'Facebook/Meta advertising conversion pixel.',
    confidence: 'high',
    signals: [
      { source: 'script', match: /connect\.facebook\.net\/.*fbevents\.js/i, evidence: 'Meta fbevents.js script' },
      { source: 'html', match: /fbq\('init'/i, evidence: 'fbq init call' },
    ],
  },
  {
    name: 'Hotjar',
    category: 'analytics',
    description: 'Behaviour analytics and heatmap tool.',
    confidence: 'high',
    signals: [{ source: 'script', match: /hotjar/i, evidence: 'Hotjar script' }],
  },
  {
    name: 'Microsoft Clarity',
    category: 'analytics',
    description: 'Behaviour analytics by Microsoft.',
    confidence: 'high',
    signals: [{ source: 'script', match: /clarity\.ms/i, evidence: 'Clarity script' }],
  },
  {
    name: 'Segment',
    category: 'analytics',
    description: 'Customer data pipeline.',
    confidence: 'high',
    signals: [{ source: 'script', match: /cdn\.segment\.(com|io)/i, evidence: 'Segment analytics.js' }],
  },
  {
    name: 'Plausible',
    category: 'analytics',
    description: 'Privacy-focused analytics.',
    confidence: 'high',
    signals: [{ source: 'script', match: /plausible\.io\/js/i, evidence: 'Plausible script' }],
  },
  {
    name: 'Matomo',
    category: 'analytics',
    description: 'Open-source analytics platform.',
    confidence: 'medium',
    signals: [{ source: 'script', match: /(matomo|piwik)(\.min)?\.js/i, evidence: 'Matomo/Piwik script' }],
  },
  {
    name: 'LinkedIn Insight Tag',
    category: 'analytics',
    description: 'LinkedIn advertising conversion tag.',
    confidence: 'medium',
    signals: [{ source: 'script', match: /snap\.licdn\.com/i, evidence: 'LinkedIn Insight script' }],
  },

  // ------------------------------------------------------- CDN / infra
  {
    name: 'Cloudflare',
    category: 'cdn',
    description: 'CDN, DNS and edge security provider.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'server', match: /cloudflare/i, evidence: 'server: cloudflare' },
      { source: 'header', header: 'cf-ray', evidence: 'cf-ray response header' },
    ],
  },
  {
    name: 'Amazon CloudFront',
    category: 'cdn',
    description: 'AWS content delivery network.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'x-amz-cf-id', evidence: 'x-amz-cf-id response header' },
      { source: 'header', header: 'via', match: /cloudfront/i, evidence: 'via: CloudFront' },
    ],
  },
  {
    name: 'Fastly',
    category: 'cdn',
    description: 'Edge cloud and content delivery network.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'x-served-by', match: /cache-/i, evidence: 'Fastly x-served-by header' },
      { source: 'header', header: 'x-fastly-request-id', evidence: 'x-fastly-request-id header' },
    ],
  },
  {
    name: 'Akamai',
    category: 'cdn',
    description: 'Content delivery and edge security network.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'server', match: /akamaighost/i, evidence: 'server: AkamaiGHost' },
      { source: 'header', header: 'x-akamai-transformed', evidence: 'x-akamai-transformed header' },
    ],
  },
  {
    name: 'jsDelivr',
    category: 'cdn',
    description: 'Open-source CDN for npm and GitHub assets.',
    confidence: 'high',
    signals: [{ source: 'script', match: /cdn\.jsdelivr\.net/i, evidence: 'jsDelivr asset' }],
  },
  {
    name: 'unpkg',
    category: 'cdn',
    description: 'CDN for npm packages.',
    confidence: 'high',
    signals: [{ source: 'script', match: /unpkg\.com/i, evidence: 'unpkg asset' }],
  },
  {
    name: 'cdnjs',
    category: 'cdn',
    description: 'Community CDN hosted by Cloudflare.',
    confidence: 'high',
    signals: [{ source: 'script', match: /cdnjs\.cloudflare\.com/i, evidence: 'cdnjs asset' }],
  },
  {
    name: 'Google Fonts',
    category: 'cdn',
    description: 'Hosted web font service.',
    confidence: 'high',
    signals: [{ source: 'link', match: /fonts\.(googleapis|gstatic)\.com/i, evidence: 'Google Fonts stylesheet' }],
  },
  {
    name: 'Vercel',
    category: 'cdn',
    description: 'Frontend deployment and edge hosting platform.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'x-vercel-id', evidence: 'x-vercel-id response header' },
      { source: 'header', header: 'server', match: /vercel/i, evidence: 'server: Vercel' },
    ],
  },
  {
    name: 'Netlify',
    category: 'cdn',
    description: 'Web deployment and edge hosting platform.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'x-nf-request-id', evidence: 'x-nf-request-id response header' },
      { source: 'header', header: 'server', match: /netlify/i, evidence: 'server: Netlify' },
    ],
  },
  {
    name: 'GitHub Pages',
    category: 'cdn',
    description: 'Static site hosting from GitHub repositories.',
    confidence: 'high',
    signals: [{ source: 'header', header: 'server', match: /github\.com/i, evidence: 'server: GitHub.com' }],
  },

  // ------------------------------------------------------ server software
  {
    name: 'Nginx',
    category: 'server',
    description: 'Web server and reverse proxy.',
    confidence: 'high',
    signals: [{ source: 'header', header: 'server', match: /\bnginx\b/i, evidence: 'server response header' }],
  },
  {
    name: 'Apache HTTP Server',
    category: 'server',
    description: 'Web server and reverse proxy.',
    confidence: 'high',
    signals: [{ source: 'header', header: 'server', match: /apache/i, evidence: 'server response header' }],
  },
  {
    name: 'LiteSpeed',
    category: 'server',
    description: 'High-performance web server.',
    confidence: 'high',
    signals: [{ source: 'header', header: 'server', match: /litespeed/i, evidence: 'server response header' }],
  },
  {
    name: 'Microsoft IIS',
    category: 'server',
    description: 'Microsoft web server.',
    confidence: 'high',
    signals: [{ source: 'header', header: 'server', match: /microsoft-iis/i, evidence: 'server response header' }],
  },
  {
    name: 'Express',
    category: 'server',
    description: 'Node.js web framework.',
    confidence: 'high',
    signals: [{ source: 'header', header: 'x-powered-by', match: /express/i, evidence: 'x-powered-by: Express' }],
  },
  {
    name: 'PHP',
    category: 'server',
    description: 'Server-side scripting runtime.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'x-powered-by', match: /php/i, evidence: 'x-powered-by: PHP' },
      { source: 'header', header: 'server', match: /php/i, evidence: 'server header references PHP' },
    ],
  },
  {
    name: 'ASP.NET',
    category: 'server',
    description: 'Microsoft server-side web framework.',
    confidence: 'high',
    signals: [
      { source: 'header', header: 'x-powered-by', match: /asp\.net/i, evidence: 'x-powered-by: ASP.NET' },
      { source: 'header', header: 'x-aspnet-version', evidence: 'x-aspnet-version response header' },
    ],
  },
]

function shortenUrl(url, max = 160) {
  try {
    const parsed = new URL(url)
    const short = `${parsed.host}${parsed.pathname}`
    return short.length > max ? `${short.slice(0, max)}…` : short
  } catch {
    return String(url).slice(0, max)
  }
}

function matches(value, pattern) {
  if (value === undefined || value === null || value === '') return false
  if (pattern instanceof RegExp) return pattern.test(String(value))
  return String(value).toLowerCase().includes(String(pattern).toLowerCase())
}

const CONFIDENCE_ORDER = { low: 0, medium: 1, high: 2 }

/**
 * @param {object} input
 * @param {string} input.html raw HTML
 * @param {Record<string,string>} input.headers lowercase response headers
 * @param {string[]} input.scriptUrls
 * @param {string[]} input.styleUrls
 * @param {string[]} input.linkUrls
 * @param {string} input.generator
 */
export function detectTechnologies({ html = '', headers = {}, scriptUrls = [], styleUrls = [], linkUrls = [], generator = '' } = {}) {
  const htmlLower = String(html).toLowerCase()
  const headerEntries = Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])

  const detections = []

  for (const fingerprint of FINGERPRINTS) {
    const evidence = []
    let confidence = 'low'

    for (const signal of fingerprint.signals) {
      let matched = false
      let label = signal.evidence || fingerprint.name

      if (signal.source === 'header') {
        const found = headerEntries.find(([key]) => key === signal.header)
        if (found) {
          matched = signal.match ? matches(found[1], signal.match) : true
          if (matched) label = `${signal.header}: ${found[1].slice(0, 120)}`
        }
      } else if (signal.source === 'generator') {
        matched = matches(generator, signal.match)
        if (matched) label = `meta generator: ${generator.slice(0, 120)}`
      } else if (signal.source === 'html') {
        if (signal.match instanceof RegExp) {
          matched = signal.match.test(html)
        } else {
          matched = htmlLower.includes(String(signal.match).toLowerCase())
        }
      } else {
        const pool =
          signal.source === 'script'
            ? scriptUrls
            : signal.source === 'style'
              ? styleUrls
              : signal.source === 'link'
                ? linkUrls
                : []
        const hit = pool.find((url) => matches(url, signal.match))
        if (hit) {
          matched = true
          label = `${signal.source === 'style' ? 'Stylesheet' : signal.source === 'link' ? 'Link' : 'Script'} ${shortenUrl(hit)}`
        }
      }

      if (matched && !evidence.includes(label)) {
        evidence.push(label)
        if (CONFIDENCE_ORDER[signal.confidence || fingerprint.confidence] > CONFIDENCE_ORDER[confidence]) {
          confidence = signal.confidence || fingerprint.confidence
        }
      }
      if (evidence.length >= 4) break
    }

    if (evidence.length > 0) {
      detections.push({
        name: fingerprint.name,
        category: fingerprint.category,
        description: fingerprint.description,
        evidence,
        confidence,
      })
    }
  }

  const categoryOrder = ['frontend', 'cms', 'analytics', 'ui', 'cdn', 'server']
  return detections.sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name),
  )
}

export { FINGERPRINTS }
