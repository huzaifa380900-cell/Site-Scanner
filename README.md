# Site Scanner — Website Analysis

**Site Scanner** is a full-stack website analysis and bug-detection dashboard. Enter a public URL and get a real, evidence-based report covering HTTP behaviour, page metadata, technology fingerprints, browser console errors, failed resources and security-header observations.

The project is a working MVP built with **Vue 3 + Vite + Tailwind CSS + DaisyUI** on the frontend and **Node.js + Express + MongoDB + Playwright + Cheerio** on the backend. Scanning is passive and bounded: no exploitation, authentication bypass, form submission or intrusive testing is performed.

![Site Scanner report overview](docs/screenshots/report-overview.png)

---

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Requirements](#requirements)
4. [Project structure](#project-structure)
5. [Installation](#installation)
6. [MongoDB Atlas configuration](#mongodb-atlas-configuration)
7. [Environment variables](#environment-variables)
8. [Running the application](#running-the-application)
9. [API documentation](#api-documentation)
10. [Scanner pipeline](#scanner-pipeline)
11. [Observation score](#observation-score)
12. [SSRF and network security model](#ssrf-and-network-security-model)
13. [Tests and verification](#tests-and-verification)
14. [Troubleshooting](#troubleshooting)
15. [Known limitations](#known-limitations)
16. [Production network isolation](#production-network-isolation)
17. [Safe scanning guidelines](#safe-scanning-guidelines)

---

## Features

- **URL scanner** with client-side UX validation and authoritative server-side validation.
- **SSRF protection** applied to every outbound request: URL/IP validation, DNS pinning, manual redirects, Playwright request interception and an enforcing loopback egress proxy for Chromium.
- **HTTP analysis**: status, response time, TTFB, content type, body size, redirect chain, HTTPS usage and full public response headers.
- **HTML analysis** with Cheerio: title, description, canonical URL, language, viewport, headings, images/alt text, internal/external links, forms, iframes, scripts and styles.
- **Technology fingerprinting** from a maintainable backend registry (React, Vue, Angular, Next.js, WordPress, MediaWiki, Shopify, GA4, GTM, Cloudflare, Nginx, Express and more). Every detection includes evidence and confidence.
- **Playwright/Chromium checks**: console errors, uncaught page errors, failed requests, main-document outcome, navigation timing, image/stylesheet outcomes.
- **Security-header observations**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, framing protection, mixed content and version disclosure. Missing headers are recommendations, never automatic "critical vulnerabilities".
- **Structured findings** with severity, category, kind (observation / potential issue / recommendation / inconclusive), evidence, affected URL, confidence and a practical remediation.
- **Heuristic observation score** with a documented formula and an explicit "unavailable" state when evidence is insufficient.
- **MongoDB persistence**, recent-scan history, report retrieval, and a read-only history UI.
- **JSON export** of the complete report (no secrets, no stack traces, no database credentials).
- **Dark, responsive SaaS dashboard** with loading, empty, success and error states, severity/category filters and keyboard-friendly controls.

### Screenshots

| Empty state | Blocked target |
| --- | --- |
| ![Empty state](docs/screenshots/empty-state.png) | ![Blocked target](docs/screenshots/blocked-target.png) |

| Technologies | Mobile |
| --- | --- |
| ![Technologies](docs/screenshots/technologies.png) | ![Mobile report](docs/screenshots/mobile-report.png) |

---

## Technology stack

**Frontend**

- Vue 3 (Composition API, Single File Components)
- Vite 6
- JavaScript ES modules
- Tailwind CSS 3 + DaisyUI 4 (custom `sitescanner` theme)
- Lucide Vue Next icons
- Native Fetch API
- Vitest for utility tests

**Backend**

- Node.js (tested on 26.7.0, requires Node 20+)
- Express 4
- MongoDB Atlas + Mongoose 8
- Playwright 1.64 with Chromium
- Cheerio
- Zod
- Helmet, express-rate-limit, CORS, dotenv
- Vitest + Supertest

Chart.js is permitted by the project brief but is **not used**: the score indicator is a native SVG ring, so there is no need to ship a charting dependency.

---

## Requirements

- **Node.js 20+** and npm 10+
- **MongoDB Atlas** account and cluster (only database used by the application)
- Internet access from the server for scanning public sites
- Playwright Chromium browser binary (`npx playwright install chromium`)

---

## Project structure

```
SiteScanner/
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppHeader.vue
│   │   │   ├── UrlScanner.vue
│   │   │   ├── OverviewCards.vue
│   │   │   ├── FindingsPanel.vue
│   │   │   ├── TechnologyPanel.vue
│   │   │   ├── BrowserPanel.vue
│   │   │   ├── MetadataPanel.vue
│   │   │   ├── ScanHistory.vue
│   │   │   └── LoadingState.vue
│   │   ├── composables/
│   │   │   └── useScanner.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── formatters.js
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── tests/
│   │   └── formatters.test.js
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── scripts/
│   │   ├── scan-smoke.js          # real scan without persistence
│   │   └── ui-smoke.js            # optional Playwright end-to-end UI check
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   ├── controllers/
│   │   │   └── scan.controller.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimiter.js
│   │   ├── models/
│   │   │   └── ScanReport.js
│   │   ├── routes/
│   │   │   ├── health.routes.js
│   │   │   └── scan.routes.js
│   │   ├── scanners/
│   │   │   ├── browserScanner.js
│   │   │   ├── chromiumRuntime.js
│   │   │   ├── findingsBuilder.js
│   │   │   ├── htmlAnalyzer.js
│   │   │   ├── httpScanner.js
│   │   │   ├── securityAnalyzer.js
│   │   │   └── techDetector.js
│   │   ├── security/
│   │   │   ├── browserRequestHandler.js
│   │   │   ├── dns.js
│   │   │   ├── egressProxy.js
│   │   │   ├── pinnedLookup.js
│   │   │   ├── safeHttpClient.js
│   │   │   └── ssrfProtection.js
│   │   ├── services/
│   │   │   └── scan.service.js
│   │   ├── utils/
│   │   │   ├── errors.js
│   │   │   └── scanLimits.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   │   ├── analysis.test.js
│   │   ├── api.test.js
│   │   ├── browserRequestHandler.test.js
│   │   ├── egressProxy.test.js
│   │   └── ssrfProtection.test.js
│   ├── .env.example
│   └── package.json
├── docs/screenshots/
├── .gitignore
├── package.json
└── README.md
```

`server/src/security/ssrfProtection.js` is the dedicated security module for target validation. There is no separate frontend/backend validation helper: the frontend validates for UX only, and the backend is always authoritative.

---

## Installation

### Windows PowerShell

```powershell
cd "C:\path\to\SiteScanner"

# Install root, server and client dependencies
npm install
npm --prefix server install
npm --prefix client install

# Install the Chromium browser used by Playwright
cd server
npx playwright install chromium
cd ..

# Create the backend environment file
Copy-Item server\.env.example server\.env
```

Then edit `server\.env` and set your MongoDB Atlas `MONGODB_URI` (see below).

Alternative installer script:

```powershell
npm run install:all
```

### macOS / Linux

```bash
cd /path/to/SiteScanner
npm install
npm --prefix server install
npm --prefix client install
(cd server && npx playwright install chromium)
cp server/.env.example server/.env
```

On Linux servers/containers you may also need the Playwright system dependencies:

```bash
cd server
npx playwright install --with-deps chromium
```

---

## MongoDB Atlas configuration

The application uses **MongoDB Atlas only**; there is no in-memory fallback or mock persistence. If Atlas is unavailable, `/api/health` reports the database as disconnected and scan persistence returns a clear `DATABASE_UNAVAILABLE` error.

1. **Create a free-tier cluster** (for example M0) in MongoDB Atlas if available in your region.
2. **Create a database user** under *Database Access* with a strong password. Use a dedicated user for this application.
3. **Configure network access** under *Network Access*:
   - Preferred: add only the public IP of the machine/server running Site Scanner.
   - Preferred in production: use VPC peering / PrivateLink / a private endpoint.
   - **Do not** leave `0.0.0.0/0` enabled. If you use a temporary broad rule for local development, remove it immediately afterwards; it exposes the cluster to the whole internet.
4. **Copy the connection string** from *Connect → Drivers*. It looks like:

   ```text
   mongodb+srv://SITE_SCANNER_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Add the database name** `site_scanner` to the path and URL-encode special characters in the password:

   ```text
   mongodb+srv://SITE_SCANNER_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/site_scanner?retryWrites=true&w=majority
   ```

6. **Put it in `server/.env`**:

   ```dotenv
   MONGODB_URI=mongodb+srv://SITE_SCANNER_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/site_scanner?retryWrites=true&w=majority
   ```

7. **Start the API and test the connection**:

   ```powershell
   npm --prefix server start
   curl.exe http://localhost:5000/api/health
   ```

   A healthy response contains `"database":{"status":"connected","connected":true}`. Until then, scans are refused with a clear error.

8. `.env` is already in `.gitignore` and must never be committed. `MONGODB_URI` is never sent to the frontend.

> **Unverified in this build environment:** no Atlas credentials were provided. The integration is complete and exercised against a real local MongoDB instance (see [Tests and verification](#tests-and-verification)); **Atlas connectivity itself has not been verified here.**

---

## Environment variables

### `server/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | *(required)* | MongoDB Atlas connection URI including `/site_scanner` |
| `PORT` | `5000` | API port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `SCAN_TIMEOUT_MS` | `30000` | Overall scan deadline |
| `NAVIGATION_TIMEOUT_MS` | `20000` | Chromium navigation timeout |
| `MAX_SCAN_CONCURRENCY` | `2` | Global concurrent scans per process |
| `MAX_REDIRECTS` | `5` | Maximum validated redirect hops |
| `MAX_RESPONSE_BYTES` | `2097152` | Main-document response size cap (2 MB) |
| `BROWSER_SCAN_ENABLED` | `true` | Enable/disable Playwright checks |
| `CHECK_LINKS` | `true` | Enable bounded internal link checks |
| `MAX_LINK_CHECKS` | `5` | Maximum internal links checked per scan |
| `ALLOWED_SCAN_PORTS` | `80,443,8080,8443` | Explicit outbound port allowlist |
| `SCAN_RATE_LIMIT_MAX` | `5` | Scan POSTs allowed per IP per window |
| `SCAN_RATE_LIMIT_WINDOW_MS` | `600000` | Rate-limit window (10 minutes) |
| `TRUST_PROXY` | *(unset)* | Set `true` only behind a reverse proxy you control |
| `APP_VERSION` | `1.0.0` | Version returned by `/api/health` |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | *(unset)* | Optional path to a pre-installed Chromium binary |

### `client/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | API base URL; `/api` uses the Vite dev proxy |

The Vite dev server proxies `/api` to `http://localhost:5000`. In production, either serve the frontend behind a reverse proxy that forwards `/api`, or set `VITE_API_BASE_URL` to the API origin and add that origin to `CLIENT_ORIGIN`.

---

## Running the application

### Development (both processes)

From the project root:

```powershell
npm run dev
```

This uses `concurrently` to start:

- API: <http://localhost:5000>
- Frontend: <http://localhost:5173>

Or run them in separate terminals:

```powershell
# terminal 1
npm --prefix server run dev

# terminal 2
npm --prefix client run dev
```

### Production build

```powershell
npm run build          # builds client/dist
npm --prefix server start
```

The client build is static; serve it with your reverse proxy of choice and configure CORS/API base URL accordingly.

### Real scan without database persistence (operator check)

Useful before Atlas is configured. It runs the same scanner stages and prints a summary, but intentionally does **not** save a report:

```powershell
npm --prefix server run scan:smoke -- https://example.com
```

### End-to-end UI check (optional)

With the API connected to MongoDB and Vite running:

```powershell
cd server
node scripts/ui-smoke.js
```

This drives Chromium through the actual UI: empty state → blocked URL → real scan → history open → tabs → JSON download → mobile layout. Screenshots are written to `docs/screenshots/`.

---

## Deploying on Vercel (frontend + API in one project)

The repository is deployed as a single Vercel project: the Vue build is served as
static output and `api/index.js` runs the Express API as a serverless function.

### Project settings

| Setting | Value |
| --- | --- |
| Root Directory | `./` |
| Framework Preset | Other |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `client/dist` |
| Node.js runtime | 20.x or newer |

### Environment variables (Production)

| Variable | Value | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | your Atlas connection string | report persistence |
| `NODE_ENV` | `production` | Express production mode |
| `TRUST_PROXY` | `true` (optional) | forces `trust proxy` on; it is **enabled by default on Vercel** |
| `CLIENT_ORIGIN` | your deployment URL | CORS allow-list |
| `BROWSER_SCAN_ENABLED` | `true` | enables the Chromium stage |

> Vercel only applies environment variables to **new** deployments. After adding or
> changing a variable you must redeploy (Deployments → ⋯ → Redeploy) for it to reach
> the running function.

### How the Chromium runtime works on Vercel

Vercel functions run on Amazon Linux 2023 but do **not** look like AWS Lambda to
`@sparticuz/chromium`: the package only inflates its bundled shared libraries
(`libnss3`, `libnspr4`, `libexpat`, …) when it sees `AWS_EXECUTION_ENV` /
`AWS_LAMBDA_JS_RUNTIME`. Without them Chromium cannot start and every scan reports
`BROWSER_UNAVAILABLE`.

`server/src/scanners/chromiumRuntime.js` performs those missing steps explicitly:

1. detect the serverless runtime and the Linux flavour,
2. inflate `al2023.tar.br` into `/tmp/al2023` and export `LD_LIBRARY_PATH`,
3. export `FONTCONFIG_PATH` (fonts) and a writable `HOME`/`TMPDIR`,
4. resolve the Chromium binary and return the launch environment.

The compressed payload itself is shipped with the function through
`vercel.json → functions["api/index.js"].includeFiles`.

### Reading the Chromium diagnostics

The browser stage writes one structured line per launch to the Vercel runtime log
(no secrets, no filesystem paths, no stack traces):

```text
[browser] Launching Chromium {"runtime":{"host":"vercel","platform":"linux",...},"libraries":"extracted","binaryPresent":true,...}
[browser] Chromium launch failed {"reason":"...error while loading shared libraries: libnss3.so..."}
```

The second line appears only when the launch really failed and contains the
sanitized reason, e.g. `BROWSER_LIBS_MISSING`, `BROWSER_BINARY_MISSING`,
`BROWSER_LAUNCH_TIMEOUT` or `BROWSER_LAUNCH_FAILED`.

### Express and the Vercel edge proxy

Vercel always sends `X-Forwarded-For`. With Express' default `trust proxy = false`,
`express-rate-limit` v7 rejects every request with
`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` (HTTP 500). The API therefore trusts **exactly
one** proxy hop (`app.set('trust proxy', 1)`) whenever it runs behind Vercel or
Lambda, and never `true`, so a spoofed `X-Forwarded-For` chain cannot bypass the
rate limiter. The effective mode is logged at startup:

```text
[app] trust proxy: enabled (1 hop)
```

---

## Deploying the API on Render with Docker

Create a Render **Web Service** from this repository and use these settings:

| Setting | Value |
| --- | --- |
| Language | Docker |
| Root Directory | `server` |
| Dockerfile Path | `./Dockerfile` |
| Docker Command | Leave blank to use the image command |
| Health Check Path | `/api/health` |
| Instance size | At least 2 GB RAM for reliable Chromium scans |

The Docker image pins the official Playwright image to `1.49.1`, matching
`playwright-core` in `server/package-lock.json`. Render supplies `PORT` (default
`10000`); the server listens on that port and `0.0.0.0`. Render's `RENDER=true`
marker makes browser scans use the image-installed Playwright Chromium instead
of extracting the Vercel/Sparticuz runtime.

Set these variables in the Render service dashboard. Never add their values to
the Dockerfile or repository:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection URI |
| `CLIENT_ORIGIN` | Exact Vercel origin, e.g. `https://site-scanner.vercel.app`; comma-separate any other allowed origins |
| `BROWSER_SCAN_ENABLED` | `true` |
| `TRUST_PROXY` | `true` (Render is detected automatically; this makes the one-hop proxy setting explicit) |

On the Vercel frontend project, set the build-time variable
`VITE_API_BASE_URL=https://<render-service>.onrender.com/api` and redeploy the
frontend. The origin in `CLIENT_ORIGIN` must match the browser's Vercel origin
exactly, without a trailing slash. In MongoDB Atlas, allow the Render service's
outbound IP ranges for its selected region, or use static egress and allow that
address; keep Atlas authentication enabled.

## API documentation

Base URL: `http://localhost:5000/api`

All responses use a consistent envelope:

```json
{ "success": true, "data": {} }
```

```json
{
  "success": false,
  "error": {
    "code": "TARGET_NOT_ALLOWED",
    "message": "This URL is not allowed for security reasons."
  }
}
```

### `GET /api/health`

Returns API status, database connectivity, version and scanner capacity. No secrets or connection details.

```bash
curl.exe http://localhost:5000/api/health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "Site Scanner API",
    "version": "1.0.0",
    "database": { "status": "connected", "connected": true },
    "scanner": { "active": 0, "limit": 2, "available": 2, "inFlight": 0 },
    "browserChecksEnabled": true,
    "uptimeSeconds": 42,
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

`status` is `degraded` when the API is up but MongoDB is disconnected.

### `POST /api/scans`

Runs a scan and persists the report. Requires a JSON body. Rate-limited per IP.

```bash
curl.exe -X POST http://localhost:5000/api/scans ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://example.com\"}"
```

- **201 Created** on success with the full report in `data`.
- **400** for malformed URL, unsupported protocol, credentials in URL, blocked host/address, disallowed port, DNS failure.
- **422** when the response is not HTML.
- **429** when the scan rate limit, duplicate-scan lock or global concurrency limit is hit.
- **503** when MongoDB is not connected or the report cannot be saved.
- **502/504** for unreachable, TLS, timeout, oversized or redirect failures.

### `GET /api/scans?page=1&limit=10`

Bounded paginated history, newest first. `limit` maximum is 50; default 10.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "665f...",
        "targetUrl": "https://example.com/",
        "hostname": "example.com",
        "status": "completed",
        "httpStatus": 200,
        "durationMs": 4820,
        "observationScore": 85,
        "findingCount": 9,
        "severityCounts": { "critical": 0, "high": 0, "medium": 0, "low": 5, "info": 4 },
        "createdAt": "2026-01-01T00:00:00.000Z",
        "completedAt": "2026-01-01T00:00:04.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
  }
}
```

### `GET /api/scans/:id`

Returns one report by 24-character MongoDB ObjectId. Invalid IDs return `400 INVALID_ID`; missing reports return `404 NOT_FOUND`.

### `DELETE /api/scans/:id`

**Not implemented.** Without authentication and verified ownership, a delete endpoint would let arbitrary users remove scan history. The dashboard is read-only. This is an intentional MVP decision, not an oversight.

---

## Scanner pipeline

1. **URL validation and safety** (`ssrfProtection.js`)
   - Only `http:`/`https:`; no embedded credentials; explicit port allowlist.
   - Rejects localhost/private/internal hostnames, metadata hostnames, alternate numeric forms and non-public IPs.
   - Resolves every A/AAAA answer, rejects the host if **any** answer is prohibited.
   - Returns the validated address list used for connection pinning.

2. **HTTP analysis** (`safeHttpClient.js` → `httpScanner.js`)
   - Redirects followed manually, each hop revalidated before connecting.
   - Pinned `lookup` prevents a second DNS resolution.
   - Timeout, 2 MB body cap, HTML content-type requirement, compressed-body handling.
   - Records status, timing, headers, redirect chain and final URL.

3. **HTML analysis** (`htmlAnalyzer.js`)
   - Cheerio extracts metadata, headings, assets, images, links, forms and mixed-content candidates.
   - Collections are capped; no page crawling.

4. **Technology detection** (`techDetector.js`)
   - Custom registry matching response headers, generator tags, HTML markers and asset URLs.
   - Evidence and confidence are stored; no Wappalyzer/AI API is required.

5. **Browser checks** (`browserScanner.js`)
   - Headless Chromium, fresh context, no profile/cookies, downloads and service workers disabled.
   - Every request passes Playwright routing **and** the enforcing egress proxy.
   - WebSockets/upgrades blocked; popups closed; page/context/browser/proxy closed in `finally`.

6. **Findings** (`findingsBuilder.js`)
   - Deduplicated, severity-ranked findings with stable IDs.
   - Explicit distinction between observation, potential issue, recommendation and inconclusive.
   - No fabricated evidence; a missing header is not reported as a vulnerability.

7. **Persistence** (`ScanReport` model)
   - Timestamps, status, HTTP data, technologies, findings, browser errors, failed resources, metadata, headers, redirects and security summary.
   - Failure to persist returns a clear error instead of pretending success.

### Bounded internal link checks

After the browser stage (time permitting), up to `MAX_LINK_CHECKS` same-origin links are checked with `HEAD` (falling back to a bodyless `GET` for servers that reject `HEAD`). Only `404`, `410` and `5xx` are classified as broken; protected or rate-limited links are skipped rather than reported as broken. The scanner never crawls discovered pages.

---

## Observation score

The UI labels the score as a **heuristic website-health indicator**, not a certified security score.

```
score = max(0, 100 − (30 × critical + 15 × high + 8 × medium + 3 × low))
```

- `info` findings never change the score.
- Each finding is deducted once; duplicates are merged.
- The floor is 0.
- If there is insufficient evidence (no parsed page / no completed HTTP observation), the score is `null` and the UI shows an unavailable state instead of inventing a number.
- The score is stored as `observationScore` with `scoreMethod: "heuristic-v1"`.

A high score does **not** mean a site is secure or bug-free.

---

## SSRF and network security model

The final rule enforced throughout the codebase: **no user-supplied URL may trigger an outbound network request until the destination has passed the server-side security policy, and no redirect or browser subresource may bypass that policy.**

### 1. Strict URL and address validation

`server/src/security/ssrfProtection.js`:

- Only `http:` and `https:` URLs; length and control-character checks.
- Rejects usernames/passwords.
- Normalizes hostnames (lowercase, IPv6 brackets, trailing dot).
- Rejects localhost, `.local`, `.internal`, `.lan`, `.home.arpa`, `.arpa`, metadata hostnames, and other non-public names.
- Parses literals with `ipaddr.js`; accepts only the `unicast` range after applying an explicit denylist for reserved, documentation, benchmarking, CGNAT, multicast, broadcast, unspecified, carrier-grade NAT, unique-local, link-local, site-local, 6to4, Teredo, NAT64 and IPv4-embedded IPv6 ranges.
- Unwraps IPv4-mapped IPv6 (`::ffff:127.0.0.1`) and classifies the embedded IPv4 address.
- Rejects zone IDs and alternate numeric host forms.
- Ports use an explicit allowlist plus an always-blocked set (SSH, databases, Redis, Elasticsearch, admin ports, etc.).
- DNS answers are inspected individually; a single private answer rejects the hostname.

### 2. DNS pinning (HTTP)

`pinnedLookup.js` creates a `lookup` function that returns **only** the already-validated addresses. `safeHttpClient.js` passes it to a per-request `http(s).Agent`, so Node cannot re-resolve the hostname when opening the socket. TLS keeps certificate verification and SNI/Host semantics (`rejectUnauthorized: true`).

Validation results are cached briefly to reduce DNS work; the cache stores the validated address list, so cache hits still connect to pinned addresses.

### 3. Manual redirects

Automatic redirect following is disabled. Each `Location` is resolved, its protocol/port checked, its host resolved and every address validated before the next request. Maximum 5 hops; loops and private destinations are rejected. `https → http` downgrades are allowed for analysis but reported as a transport finding.

### 4. Browser protection (two layers)

1. **Request interception** (`browserRequestHandler.js`): every navigation, iframe, script, stylesheet, image, XHR/fetch, favicon and WebSocket URL is validated against the same policy. Blocked requests are aborted with `blockedbyclient` and reported in the scan.
2. **Enforcing egress proxy** (`egressProxy.js`): Chromium is launched with `--proxy-server=http://127.0.0.1:<ephemeral>` and `--proxy-bypass-list=<-loopback>`, so even loopback destinations go through the proxy. The proxy performs its own DNS resolution and connects only to validated IPs, pinning the TCP connection. HTTPS is tunnelled end-to-end (TLS is not intercepted), preserving certificate verification.

WebSockets are closed at the Playwright layer and protocol upgrades are denied by the proxy. Downloads, popups and service workers are disabled. Chromium is launched with a minimal environment that does **not** include `MONGODB_URI` or other application secrets. No cookies, credentials or browser profiles are imported.

### 5. Resource controls

- Per-IP scan rate limit (default 5 per 10 minutes).
- Global scan concurrency semaphore (default 2) with a duplicate-scan lock.
- Overall scan deadline, navigation timeout, per-hop HTTP timeout, link-check timeout.
- Response-size cap, redirect cap, inspected-link/resource caps.
- Browser launch/context/page and proxy cleanup in `finally`.

### 6. Error handling

Blocked targets return generic security messages and stable codes. API responses never include internal IPs, DNS details, filesystem paths, stack traces or database credentials. Server-side errors are logged without secret values.

> Application-level SSRF protection reduces risk but is **not** a complete production isolation boundary. See [Production network isolation](#production-network-isolation).

---

## Tests and verification

### Automated tests

Server (Vitest + Supertest):

```powershell
npm --prefix server test
```

Result in this environment: **5 test files, 133 tests passed**:

- `ssrfProtection.test.js` — 72 tests: private IPv4/IPv6, mapped addresses, metadata endpoints, credentials, protocols, ports, alternate representations, DNS failures, mixed DNS answers, caching, pinned lookup, redirect validation, loops, limits.
- `egressProxy.test.js` — 8 tests: real loopback proxy rejects CONNECT to private IPs, hostnames resolving privately, disallowed ports, plain HTTP to private targets and upgrades; proves no TCP connection is made when blocked.
- `browserRequestHandler.test.js` — 8 tests: the actual Playwright route handler aborts private subresources and metadata requests and allows public ones.
- `api.test.js` — 25 tests: health, SSRF rejection at the API boundary, malformed JSON, validation errors, CORS, pagination, invalid/missing IDs, no secret leakage.
- `analysis.test.js` — 20 tests: HTML extraction, technology evidence, security observation severity, score formula, deduplication and "not bug-free" wording.

Client:

```powershell
npm --prefix client test
```

Result: **16 tests passed** (URL UX validation, formatters, score tones, filename sanitization).

### Manual/end-to-end verification performed

- `npm run build` — production Vue build succeeded.
- API health with MongoDB disconnected — returned `degraded` and `database.connected: false`.
- API rejected `http://127.0.0.1` with `400 PROHIBITED_ADDRESS`; a valid public URL with no database returned `503 DATABASE_UNAVAILABLE`.
- Chromium scan of `https://example.com` through the egress proxy — completed, HTTP 200, real navigation timing, no console errors.
- Full pipeline smoke runs against `https://example.com` and `https://www.wikipedia.org` — real findings, MediaWiki detection, link checking, heuristic score.
- **Temporary local MongoDB verification**: persistence, history list, retrieval by ID and JSON export were exercised against a real MongoDB instance started temporarily for testing (not part of the application). Two scans were persisted and read back; the stored document contained no credentials.
- **Playwright UI E2E** (`server/scripts/ui-smoke.js`): empty state, blocked URL error, real scan, score rendering, findings, technology/browser/metadata tabs, history retrieval, JSON download contents, mobile layout without horizontal overflow — all checks passed, zero page errors.
- JSON export was inspected for required sections and confirmed free of `MONGODB_URI`, MongoDB URIs and cookies.

### Not verified

- **MongoDB Atlas connectivity** — no Atlas credentials were available. The application is configured exclusively through `MONGODB_URI`; no mock persistence exists in the app.
- Load behaviour at high concurrency, multi-instance rate limiting and long-running production operation.
- Every possible browser/CDN edge case. A single automated visit cannot prove a website is bug-free.

---

## Troubleshooting

### `DATABASE_UNAVAILABLE` / health shows `database.connected: false`

- Confirm `server/.env` exists and `MONGODB_URI` is set.
- Check the Atlas database user's password is URL-encoded (`@`, `:`, `/`, `#`, `%`).
- Check **Network Access** includes the IP of the machine running the API.
- Confirm the URI includes a database name: `.../site_scanner?...`.
- Run `curl.exe http://localhost:5000/api/health` and inspect the server console. Credentials are never logged.
- The API retries the initial connection every 15 seconds; restarting the server after fixing `.env` is the simplest path.

### `BROWSER_UNAVAILABLE` / Playwright launch fails

Locally:

```powershell
cd server
npx playwright install chromium
```

On Linux also install OS dependencies:

```bash
npx playwright install --with-deps chromium
```

On Vercel no browser has to be installed: the runtime bootstrap in
`server/src/scanners/chromiumRuntime.js` inflates the bundled Chromium payload and
its Amazon Linux 2023 shared libraries. Check the Vercel runtime log for the
`[browser] Chromium launch failed` line — it states the real reason
(missing binary, missing `libnss3.so`, launch timeout, …) while the API response
stays generic on purpose.

If Chromium must live elsewhere, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and pass it to `chromium.launch({ executablePath })` in `browserScanner.js` (the variable is reserved in `.env.example`).

### `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` in the Vercel runtime log

Express is running behind Vercel's edge proxy, which always sends
`X-Forwarded-For`. `trust proxy` must be enabled for one hop; the API does this
automatically on Vercel/Lambda and prints `[app] trust proxy: enabled (1 hop)` at
startup. Set `TRUST_PROXY=false` only if the API is deployed without a proxy.
Remember that a changed environment variable requires a **new deployment**.

### Port already in use

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen
```

Change `PORT` in `server/.env`, and update the Vite proxy target in `client/vite.config.js`.

### CORS error / `CORS_NOT_ALLOWED`

The browser's `Origin` must be listed in `CLIENT_ORIGIN` (comma-separated). `http://localhost:5173` and `http://127.0.0.1:5173` are **different origins**; add both if you use both.

### `429 RATE_LIMITED` while testing

The scan limiter defaults to 5 POSTs per IP per 10 minutes, and rejected attempts count. Wait for the window, raise `SCAN_RATE_LIMIT_MAX` for local testing, or restart the API (the default store is in-memory).

### Scan fails with `TARGET_NOT_ALLOWED`

The target resolved to a private, reserved or metadata address, used a disallowed port, or embedded credentials. This is intentional. Use a normal public website and the default ports.

### `UNSUPPORTED_CONTENT_TYPE`

The submitted URL returned a non-HTML document (PDF, image, JSON). Site Scanner analyses web pages, not arbitrary files.

### Vite watcher crash on Windows (`EBUSY ... .tmpdir`)

Some editors write atomically via temporary directories. Remove the stale `.tmpdir` folder under `client/src` and restart Vite, or configure the editor to write files in place.

---

## Known limitations

- **One page per scan.** No crawling, sitemap parsing or multi-page flows. Link checks are capped at 5 same-origin links.
- **Passive analysis only.** No authenticated areas, no form submission, no exploitation, no brute force. Client-side rendered content is only partly observed through the browser stage.
- **Browser noise.** Third-party analytics/tracker failures are reported separately and may be caused by network policy or ad-blocking; they are not labelled as site bugs.
- **WebSockets are blocked** during scans for SSRF safety. Sites relying on them may show expected connection errors.
- **No authentication or ownership.** History is global and read-only. `DELETE /api/scans/:id` is intentionally absent. A public deployment needs accounts, per-user ownership and abuse controls.
- **Rate limiting is per process, in memory.** Multi-instance deployments need a shared store (Redis) or edge rate limiting.
- **SQL/NoSQL injection, XSS probing and authenticated flows are out of scope.** Findings are configuration/behaviour observations, not a vulnerability assessment.
- **No screenshots of the target** are captured or stored.
- **Score is heuristic.** It is not comparable to a certified security rating.
- **Playwright** needs OS-level browser dependencies on minimal Linux images.
- **Atlas connectivity was not verified here** because no credentials were supplied.

---

## Production network isolation

Application-level validation and the egress proxy are necessary but not sufficient for exposing arbitrary scanning to the public internet. Before doing so:

1. **Run the scanner in a separate worker/container** from the API and database credentials.
2. **Apply egress firewall rules** that deny:
   - RFC1918 private ranges, loopback, link-local, multicast and reserved ranges;
   - cloud metadata endpoints (`169.254.169.254`, `fd00:ec2::254`, `metadata.google.internal`);
   - internal DNS zones, Kubernetes service IPs and host management interfaces.
3. **Allow only public HTTP/HTTPS** egress (prefer an allowlist or an enforcing egress gateway). Use the loopback proxy as defense-in-depth, not as the sole boundary.
4. **Do not give the browser worker** `MONGODB_URI`, API tokens or filesystem mounts containing secrets. The implementation passes a minimal environment to Chromium, but container isolation should enforce this too.
5. **Run with least privilege**: non-root user, read-only filesystem where possible, dropped capabilities, resource limits (CPU/memory/PIDs), no host networking.
6. **Add authentication and per-user ownership**, quotas, audit logging, abuse monitoring and a takedown/blocklist process.
7. **Keep Chromium, Playwright and Node patched**; rebuild images regularly.
8. **Add monitoring** for scan duration, browser crashes, queue depth, blocked-request ratios and database health.
9. **Use a managed egress proxy or network sandbox** if you need stronger guarantees than application-level DNS pinning.
10. **Do not enable `TRUST_PROXY`** unless the API is behind a reverse proxy you control; otherwise clients can spoof `X-Forwarded-For` and bypass per-IP limits.

Until these controls exist, treat this project as a **development/local MVP**, not a public scanning service.

---

## Safe scanning guidelines

- Only scan websites you own or are authorised to test.
- Respect the target's terms of service, `robots.txt` intent and applicable law.
- The scanner performs a single page load plus a few bounded link checks; do not modify it into a high-volume crawler.
- Do not use the results to claim a site is secure or vulnerable without human verification.
- Report security issues privately to the site owner.
- Keep rate limits and concurrency conservative when running on shared infrastructure.

---

## License / usage

This project was generated as a full-stack MVP for the **Site Scanner** brief. Use it responsibly and only against systems you are allowed to analyse.
