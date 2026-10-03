// ── ecosystem.preview.cjs ────────────────────────────────────────────────
// v5.5.1 GA preview — runs `wrangler pages dev` so the built SPA at ./dist
// AND the Cloudflare Pages Functions layer (functions/api/[[route]].ts,
// including POST /api/anchor from M1.7) are served together on port 3000.
//
// This ecosystem file is git-tracked so anyone can reproduce the preview:
//   npm run build && pm2 start ecosystem.preview.cjs
//
// The default ecosystem.config.cjs uses the custom server.mjs (SPA only) —
// keep that for pre-M1.7 layouts; use this one when /api/anchor must run.

const fs = require('fs')
const path = require('path')

// Mirror the Wrangler .dev.vars convention: parse local secrets and expose
// them to the wrangler process so the Functions layer can read them.
const devVars = {}
try {
  const txt = fs.readFileSync(path.join(__dirname, '.dev.vars'), 'utf8')
  for (const line of txt.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    devVars[t.slice(0, eq).trim()] = val
  }
} catch { /* .dev.vars missing — wrangler will still boot */ }

module.exports = {
  apps: [
    {
      name: 'webapp-preview',
      script: 'npx',
      // `wrangler pages dev dist` serves the built SPA + Functions layer
      //   --ip 0.0.0.0  → bind all interfaces (required for sandbox tunneling)
      //   --port 3000   → uniform port (matches ecosystem.config.cjs)
      //   --compatibility-date=2024-01-01 (matches wrangler.jsonc)
      //   --compatibility-flag nodejs_compat (matches wrangler.jsonc; xrpl SDK needs it)
      //   --log-level=info (visible startup + request logs)
      args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000 --compatibility-date 2024-01-01 --compatibility-flag nodejs_compat --log-level info',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        // Non-interactive flag so wrangler never blocks on a prompt
        WRANGLER_SEND_METRICS: 'false',
        CI: '1',
        ...devVars,
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: 3000,
      // Route all wrangler output into a single log for easy pm2 logs --nostream
      out_file:   '/home/user/.pm2/logs/webapp-preview-out.log',
      error_file: '/home/user/.pm2/logs/webapp-preview-err.log',
      merge_logs: true,
    },
  ],
}
