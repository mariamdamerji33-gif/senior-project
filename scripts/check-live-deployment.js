/**
 * Validates backend (and optional frontend) env against LIVE_SCHOOL_DEPLOYMENT.md.
 * Usage (from repo root): node scripts/check-live-deployment.js
 * Stricter rules: node scripts/check-live-deployment.js --strict
 *
 * --strict: treat as production (JWT length, CORS origins required, VITE_API_BASE_URL in frontend env).
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const backendEnv = path.join(root, 'backend', '.env')
const frontendEnvProd = path.join(root, 'frontend', '.env.production')
const frontendEnv = path.join(root, 'frontend', '.env')
const mobileAppJson = path.join(root, 'mobile', 'app.json')

const strict = process.argv.includes('--strict')

function loadEnvFile(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function hasCorsOrigin(env) {
  const fe = String(env.FRONTEND_ORIGIN || '')
    .trim()
    .replace(/\/$/, '')
  if (fe) return true
  const extra = String(env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return extra.length > 0
}

let failed = false
function ok(msg) {
  console.log(`  ✓ ${msg}`)
}
function bad(msg) {
  console.error(`  ✗ ${msg}`)
  failed = true
}
function warn(msg) {
  console.warn(`  ⚠ ${msg}`)
}

console.log('Live deployment check' + (strict ? ' (--strict)' : '') + '\n')

console.log('[backend] ' + backendEnv)
if (!fs.existsSync(backendEnv)) {
  bad('Missing backend/.env — copy backend/.env.example and fill values.')
} else {
  ok('backend/.env exists')
  const env = loadEnvFile(backendEnv)
  const nodeEnv = String(env.NODE_ENV || '').toLowerCase()

  if (!String(env.SUPABASE_URL || '').trim()) bad('SUPABASE_URL is empty')
  else ok('SUPABASE_URL is set')

  if (!String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) bad('SUPABASE_SERVICE_ROLE_KEY is empty')
  else ok('SUPABASE_SERVICE_ROLE_KEY is set')

  if (!String(env.SUPABASE_ANON_KEY || '').trim()) {
    const msg = 'SUPABASE_ANON_KEY is empty'
    if (strict || nodeEnv === 'production') bad(msg)
    else warn(msg)
  } else {
    ok('SUPABASE_ANON_KEY is set')
  }

  const jwt = String(env.JWT_SECRET || '').trim()
  if (!jwt) {
    bad('JWT_SECRET is empty')
  } else if (strict && jwt.length < 32) {
    bad(`JWT_SECRET must be ≥ 32 characters in production (got ${jwt.length})`)
  } else if (jwt.length < 32) {
    warn(`JWT_SECRET is short (${jwt.length} chars); use ≥ 32 for production`)
    ok('JWT_SECRET is set')
  } else {
    ok(`JWT_SECRET length OK (${jwt.length} chars)`)
  }

  if (strict || nodeEnv === 'production') {
    if (!hasCorsOrigin(env)) {
      bad('Set FRONTEND_ORIGIN and/or CORS_ORIGINS so browsers can call the API')
    } else {
      ok('CORS: FRONTEND_ORIGIN or CORS_ORIGINS has at least one origin')
    }
    if (nodeEnv !== 'production' && strict) {
      warn('NODE_ENV is not "production" in backend/.env — set NODE_ENV=production on the live server')
    }
  } else {
    ok('CORS skipped (set NODE_ENV=production or run with --strict)')
  }
}

console.log('')
const feFile = fs.existsSync(frontendEnvProd) ? frontendEnvProd : frontendEnv
console.log('[frontend] ' + (fs.existsSync(frontendEnvProd) ? '.env.production' : '.env'))

if (strict) {
  const feMerged = {
    ...loadEnvFile(frontendEnv),
    ...loadEnvFile(frontendEnvProd),
  }
  const api = String(feMerged.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '')
  if (!api) {
    bad(
      'Set VITE_API_BASE_URL in frontend/.env.production (or frontend/.env) — API origin only, no path',
    )
  } else if (api.includes('/api') || api.endsWith('/login')) {
    bad('VITE_API_BASE_URL should be origin only (no /api path): ' + api)
  } else if (/^(http:\/\/127\.0\.0\.1|http:\/\/localhost)/i.test(api)) {
    bad('VITE_API_BASE_URL still points to localhost; set it to the live HTTPS API before production deploy')
  } else if (!/^https:\/\//i.test(api)) {
    bad('VITE_API_BASE_URL should use HTTPS in production: ' + api)
  } else {
    ok('VITE_API_BASE_URL looks like an API origin: ' + api)
  }
} else {
  if (fs.existsSync(frontendEnvProd)) {
    const fe = loadEnvFile(frontendEnvProd)
    if (fe.VITE_API_BASE_URL) ok('frontend/.env.production has VITE_API_BASE_URL')
    else warn('frontend/.env.production exists but VITE_API_BASE_URL is empty')
  } else {
    warn('No frontend/.env.production — create it before production build (see frontend/.env.production.example)')
  }
}

console.log('')
console.log('[mobile] app.json')
if (!fs.existsSync(mobileAppJson)) {
  warn('mobile/app.json not found; skip mobile API URL check')
} else {
  try {
    const mobileConfig = JSON.parse(fs.readFileSync(mobileAppJson, 'utf8'))
    const mobileApi = String(mobileConfig?.expo?.extra?.apiBaseUrl || '').trim().replace(/\/$/, '')
    if (!mobileApi) {
      const msg =
        'mobile expo.extra.apiBaseUrl is blank; OK for Expo LAN demo, set it for emulator/USB/production mobile builds'
      if (strict) warn(msg)
      else ok(msg)
    } else if (mobileApi.includes('/api')) {
      bad('mobile expo.extra.apiBaseUrl should be origin only (no /api path): ' + mobileApi)
    } else if (strict && /^(http:\/\/127\.0\.0\.1|http:\/\/localhost)/i.test(mobileApi)) {
      bad('mobile expo.extra.apiBaseUrl still points to localhost; set it to the live HTTPS API before production mobile builds')
    } else {
      ok('mobile expo.extra.apiBaseUrl is set: ' + mobileApi)
    }
  } catch (err) {
    bad('mobile/app.json is not valid JSON: ' + (err?.message || err))
  }
}

console.log('')
if (failed) {
  console.error('Fix the issues above, then re-run: node scripts/check-live-deployment.js --strict')
  process.exit(1)
}
console.log('All checked conditions passed.')
process.exit(0)
