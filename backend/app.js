const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const { createRateLimiter, isProd } = require('./middleware/rateLimitFactory');

const homeRoutes = require('./mvc/routes/homeRoutes');
const authRoutes = require('./mvc/routes/authRoutes');
const authController = require('./mvc/controllers/authController');
const { csrfGuard } = require('./middleware/csrf');
const teacherRoutes = require('./mvc/routes/teacherRoutes');
const parentRoutes = require('./mvc/routes/parentRoutes');
const managerRoutes = require('./mvc/routes/managerRoutes');
const adminRoutes = require('./mvc/routes/adminRoutes');
const chatRoutes = require('./mvc/routes/chatRoutes');
const studentRoutes = require('./mvc/routes/studentRoutes');
const announcementRoutes = require('./mvc/routes/announcementRoutes');
const supportRoutes = require('./mvc/routes/supportRoutes');

/** Where the React app runs (no trailing slash). Used to redirect GET /login away from the API port. */
function resolveFrontendOrigin() {
  const explicit = process.env.FRONTEND_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return '';
  return 'http://localhost:5173';
}

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // API-first CSP: strict in production. Frontend CSP should also be set on static host / reverse proxy.
    contentSecurityPolicy: isProd
      ? {
          useDefaults: false,
          directives: {
            defaultSrc: ["'none'"],
            baseUri: ["'none'"],
            frameAncestors: ["'none'"],
            formAction: ["'none'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'none'"],
            styleSrc: ["'none'"],
            imgSrc: ["'none'"],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    ...(isProd
      ? {
          hsts: { maxAge: 31536000, includeSubDomains: true, preload: false },
          crossOriginResourcePolicy: { policy: 'cross-origin' },
        }
      : {}),
  }),
);

const frontendOrigin = resolveFrontendOrigin();
const extraOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => s.replace(/\/$/, ''));
const allowedOrigins = new Set([frontendOrigin, ...extraOrigins].filter(Boolean));

/** Browsers treat localhost vs 127.0.0.1 as different origins; allow both during local dev + Vite preview. */
if (!isProd) {
  for (const o of ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']) {
    allowedOrigins.add(o);
  }
}

if (isProd && allowedOrigins.size === 0) {
  console.error(
    '❌ Production: set FRONTEND_ORIGIN and/or CORS_ORIGINS in backend/.env so browsers can call this API.',
  );
  process.exit(1);
}

app.use(compression());

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / curl / server-to-server (no Origin header)
      if (!origin) return cb(null, true);
      const o = String(origin).replace(/\/$/, '');
      if (allowedOrigins.has(o)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      process.env.CSRF_HEADER_NAME || 'x-csrf-token',
      'X-ASP-Client',
    ],
  }),
);

app.use(express.json({ limit: '200kb', strict: true }));

// Basic anti-abuse. Non-production skips limiters entirely unless FORCE_RATE_LIMIT=true (see middleware/rateLimitFactory.js).
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  skip: (req) => req.method === 'GET',
  limit: isProd ? 260 : 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const loginLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: isProd ? 80 : 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const registrationStatusLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  limit: isProd ? 180 : 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: isProd ? 180 : 400,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => {
    const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
    if (pathOnly.startsWith('/api/auth')) return true;
    if (req.method !== 'GET') return false;
    return pathOnly === '/api/health' || pathOnly.endsWith('/api/health');
  },
});

app.use('/api/auth', authLimiter);
app.use('/api', writeLimiter);
app.use('/api', csrfGuard);

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/registration-status', registrationStatusLimiter);

app.use('/', homeRoutes);
app.use('/api/auth', authRoutes);
// Some tools or mis-set VITE_API_BASE_URL values call POST /login; canonical route is POST /api/auth/login
app.post('/login', loginLimiter, authController.login);
app.get('/login', (req, res) => {
  const origin = resolveFrontendOrigin();
  if (origin) {
    return res.redirect(302, `${origin}/login`);
  }
  res.status(404).json({
    error: 'This URL is the API server, not the React login page.',
    path: req.originalUrl || req.url,
    hint:
      'Open the app from the Vite dev server (e.g. http://localhost:5173/login) or your static host. To log in via API, send POST to /api/auth/login (or POST /login) with JSON { "email", "password", "role" }.',
  });
});
app.use('/api/teacher', teacherRoutes);
/** @deprecated use /api/teacher — kept so older clients keep working until rebuilt */
app.use('/api/therapist', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/support', supportRoutes);

// Central error handler (CORS/helmet/rate-limit errors, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const msg = err instanceof Error ? err.message : String(err || 'Error');
  if (String(msg).includes('CORS blocked')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'Upload rejected',
      ...(process.env.NODE_ENV !== 'production' ? { details: msg } : null),
    });
  }
  if (/Only PDF uploads are allowed/i.test(msg)) {
    return res.status(400).json({ error: 'Only PDF uploads are allowed' });
  }
  if (/Only JPEG, PNG, or WebP/i.test(msg)) {
    return res.status(400).json({ error: msg });
  }
  res.status(500).json({
    error: 'Server error',
    ...(process.env.NODE_ENV !== 'production' ? { details: msg } : null),
  });
});

app.use((req, res) => {
  const urlPath = String(req.originalUrl || req.url || '');
  const doubledApi = /\/api\/api(\/|\?|$)/.test(urlPath);
  res.status(404).json({
    error: 'API route not found',
    path: urlPath,
    hint: doubledApi
      ? 'The URL contains `/api/api/…`. In the frontend `.env`, set `VITE_API_BASE_URL` to the server origin only (e.g. `http://localhost:5000`), not `http://localhost:5000/api`. Paths already include `/api`.'
      : 'Open /console for a styled API page, or the React app (e.g. port 5173). Teacher API: GET /api/teacher/overview. Auth: POST /api/auth/login. After pulling code changes, restart the backend (npm start in the backend folder).',
  });
});

module.exports = app;
