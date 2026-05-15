/**
 * Shared branded HTML/CSS for Express “console” pages (matches frontend violet + teal).
 * No build step — inline styles for portability.
 */

const CSS = `
:root {
  --violet: #5b3fc9;
  --violet-dim: #ebe4ff;
  --teal: #0d9488;
  --teal-dim: rgba(13, 148, 136, 0.12);
  --text: #3d3652;
  --text-h: #14101c;
  --card: #ffffff;
  --border: #e4dcf5;
  --radius: 14px;
  --shadow: 0 18px 40px -16px rgba(80, 50, 160, 0.18);
  --sans: "DM Sans", system-ui, sans-serif;
  --display: "Outfit", system-ui, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.55;
  color: var(--text);
  background:
    radial-gradient(ellipse 120% 80% at 50% -20%, rgba(91, 63, 201, 0.16), transparent 55%),
    radial-gradient(ellipse 50% 40% at 100% 0%, rgba(13, 148, 136, 0.08), transparent 45%),
    linear-gradient(180deg, #f3f0fb 0%, #ede8f7 100%);
}
.shell {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 3rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}
.logo {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--violet) 0%, #7c5ce8 100%);
  box-shadow: 0 8px 24px -8px rgba(91, 63, 201, 0.55);
  display: grid;
  place-items: center;
  color: #fff;
  font-family: var(--display);
  font-weight: 800;
  font-size: 1.1rem;
}
h1 {
  font-family: var(--display);
  font-size: clamp(1.5rem, 4vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-h);
  margin: 0;
  line-height: 1.2;
}
.sub {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  opacity: 0.88;
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem 1.35rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow);
}
.card h2 {
  font-family: var(--display);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--violet);
  margin: 0 0 0.75rem;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(228, 220, 245, 0.85);
  font-size: 0.92rem;
}
.row:last-child { border-bottom: none; }
.k { opacity: 0.85; }
.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.badge-ok { background: var(--teal-dim); color: #0f766e; }
.badge-bad { background: #fee2e2; color: #b91c1c; }
.badge-warn { background: #fef3c7; color: #b45309; }
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
a.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--violet);
  background: rgba(91, 63, 201, 0.08);
  border: 1px solid rgba(91, 63, 201, 0.25);
  transition: transform 0.15s ease, background 0.15s ease;
}
a.btn:hover {
  background: rgba(91, 63, 201, 0.14);
  transform: translateY(-1px);
}
a.btn-secondary {
  color: var(--teal);
  background: var(--teal-dim);
  border-color: rgba(13, 148, 136, 0.35);
}
footer {
  margin-top: 2rem;
  font-size: 0.8rem;
  opacity: 0.75;
  text-align: center;
}
code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.84em;
  padding: 0.15em 0.4em;
  background: rgba(91, 63, 201, 0.07);
  border-radius: 6px;
}
`;

function documentPage(title, inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;1,9..40,400&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>${CSS}</style>
</head>
<body>
  <div class="shell">
    ${inner}
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badgeForDb(state) {
  if (state === 'ok') return '<span class="badge badge-ok">Connected</span>';
  if (state === 'error') return '<span class="badge badge-bad">Error</span>';
  return '<span class="badge badge-warn">Unknown</span>';
}

function badgeBool(on) {
  return on
    ? '<span class="badge badge-ok">Yes</span>'
    : '<span class="badge badge-bad">No</span>';
}

/**
 * @param {object} h - health payload (same fields as JSON health)
 */
function renderHealthHtml(h) {
  const inner = `
    <div class="brand">
      <div class="logo">AL</div>
      <div>
        <h1>API health</h1>
        <p class="sub">${escapeHtml(h.service || 'autism-platform-api')}</p>
      </div>
    </div>
    <div class="card">
      <h2>Status</h2>
      <div class="row"><span class="k">Database</span> ${badgeForDb(h.database)}</div>
      <div class="row"><span class="k">Supabase URL</span> ${badgeBool(h.supabaseUrlConfigured)}</div>
      <div class="row"><span class="k">Service role key</span> ${badgeBool(h.serviceRoleKeyConfigured)}</div>
      <div class="row"><span class="k">Time</span> <span>${escapeHtml(h.ts || '')}</span></div>
      <div class="row"><span class="k">Env file</span> <span style="font-size:0.82em;word-break:break-all">${escapeHtml(h.envFileHint || '')}</span></div>
    </div>
    <div class="links">
      <a class="btn" href="/api/health">JSON</a>
      <a class="btn btn-secondary" href="/console">API home</a>
    </div>
    <footer>Open the React app on port 5173 for the full UI.</footer>
  `;
  return documentPage('API health — Autism Learning Platform', inner);
}

/**
 * @param {object} opts
 * @param {string} [opts.frontendOrigin] - e.g. http://localhost:5173
 */
function renderApiConsoleHtml(opts = {}) {
  const fe = opts.frontendOrigin || 'http://localhost:5173';
  const inner = `
    <div class="brand">
      <div class="logo">AL</div>
      <div>
        <h1>Autism Learning Platform</h1>
        <p class="sub">Express API — development console</p>
      </div>
    </div>
    <div class="card">
      <h2>Quick links</h2>
      <p style="margin:0 0 0.75rem; font-size:0.92rem;">Use these endpoints while the backend runs on port <strong>5000</strong>.</p>
      <div class="links">
        <a class="btn" href="/api/health?view=html">Health (visual)</a>
        <a class="btn" href="/api/health">Health (JSON)</a>
      </div>
    </div>
    <div class="card">
      <h2>Frontend</h2>
      <p style="margin:0; font-size:0.92rem;">The web UI is served separately (Vite). Open:</p>
      <p style="margin:0.65rem 0 0;"><a class="btn" href="${escapeHtml(fe)}">${escapeHtml(fe)}</a></p>
    </div>
    <div class="card">
      <h2>Auth</h2>
      <p style="margin:0;font-size:0.92rem;">Login: <code>POST /api/auth/login</code> with JSON body <code>email</code>, <code>password</code>, <code>role</code>.</p>
    </div>
    <footer><code>GET /</code> returns API info (JSON). Open the links above for health and the React app.</footer>
  `;
  return documentPage('API — Autism Learning Platform', inner);
}

module.exports = {
  renderHealthHtml,
  renderApiConsoleHtml,
  escapeHtml,
};
