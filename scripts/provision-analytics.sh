#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  provision-analytics.sh — v4.8.2
#  ─────────────────────────────────────────────────────────────────────
#  One-shot Cloudflare R2 + Pipelines provisioning for easy-tenancy
#  analytics stream → R2 Parquet sink.
#
#  Translates the user's legacy command set to the wrangler 4.83.0 API:
#    npx wrangler r2 bucket create easy-tenancy-analytics
#    npx wrangler pipelines create easy-tenancy-analytics \
#      --r2-bucket easy-tenancy-analytics \
#      --batch-max-mb 10 \
#      --batch-max-seconds 30 \
#      --compression gzip \
#      --output-format parquet
#
#  New architecture: Stream → Sink → Pipeline (SQL).
#
#  REQUIREMENTS
#    - CLOUDFLARE_API_TOKEN env var set (run `setup_cloudflare_api_key`)
#    - Token scopes required:
#        · Account · Workers R2 Storage · Edit
#        · Account · Workers Pipelines · Edit
#        · Account · Account Settings · Read     (for whoami)
#        · User    · User Details · Read         (optional, for whoami)
#        · User    · Memberships · Read          (optional, for whoami)
#
#  USAGE
#    bash scripts/provision-analytics.sh
#    # or: npm run analytics:provision
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

BUCKET="easy-tenancy-analytics"
STREAM="easy-tenancy-events"
SINK="easy-tenancy-r2-sink"
PIPELINE="easy-tenancy-analytics"

# ── Sink config (translated from legacy flags) ─────────────────────
SINK_FORMAT="parquet"            # was --output-format parquet
SINK_COMPRESSION="gzip"          # was --compression gzip
SINK_ROLL_SIZE_MB=10             # was --batch-max-mb 10
SINK_ROLL_INTERVAL_S=30          # was --batch-max-seconds 30
SINK_PATH="events/year=%Y/month=%m/day=%d/hour=%H/"
SINK_PARTITIONING="event_time"   # Hive-style time partitioning

C_BLUE='\033[1;34m'
C_GRN='\033[1;32m'
C_YLW='\033[1;33m'
C_RED='\033[1;31m'
C_DIM='\033[2m'
C_RST='\033[0m'

step() { printf "\n${C_BLUE}━━━ %s ━━━${C_RST}\n" "$1"; }
ok()   { printf "${C_GRN}✓${C_RST} %s\n" "$1"; }
warn() { printf "${C_YLW}⚠${C_RST} %s\n" "$1"; }
fail() { printf "${C_RED}✘${C_RST} %s\n" "$1"; exit 1; }

# ── 0 · Preflight ──────────────────────────────────────────────────
step "0 · Preflight"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  fail "CLOUDFLARE_API_TOKEN not set. Run setup_cloudflare_api_key first."
fi
ok "CLOUDFLARE_API_TOKEN present"

WRANGLER_VER=$(npx wrangler --version 2>/dev/null | tail -1 || echo "unknown")
ok "wrangler $WRANGLER_VER"

# ── 1 · R2 bucket ──────────────────────────────────────────────────
step "1 · R2 bucket · $BUCKET"
if npx wrangler r2 bucket list 2>/dev/null | grep -q "^$BUCKET\b"; then
  ok "Bucket already exists — skipping create"
else
  npx wrangler r2 bucket create "$BUCKET"
  ok "Bucket created"
fi

# ── 2 · Stream (the ingress) ───────────────────────────────────────
step "2 · Stream · $STREAM"
if npx wrangler pipelines streams list 2>/dev/null | grep -q "$STREAM"; then
  ok "Stream already exists — skipping create"
else
  npx wrangler pipelines streams create "$STREAM" \
    --http-enabled \
    --http-auth
  ok "Stream created (HTTP enabled, auth required)"
fi

# ── 3 · Sink (R2 Parquet target) ───────────────────────────────────
step "3 · Sink · $SINK → R2 Parquet"
if npx wrangler pipelines sinks list 2>/dev/null | grep -q "$SINK"; then
  ok "Sink already exists — skipping create"
else
  npx wrangler pipelines sinks create "$SINK" \
    --type r2 \
    --bucket "$BUCKET" \
    --format "$SINK_FORMAT" \
    --compression "$SINK_COMPRESSION" \
    --roll-size "$SINK_ROLL_SIZE_MB" \
    --roll-interval "$SINK_ROLL_INTERVAL_S" \
    --path "$SINK_PATH"
  ok "Sink created (parquet · gzip · ${SINK_ROLL_SIZE_MB}MB · ${SINK_ROLL_INTERVAL_S}s)"
fi

# ── 4 · Pipeline (the SQL glue Stream → Sink) ──────────────────────
step "4 · Pipeline · $PIPELINE"
if npx wrangler pipelines list 2>/dev/null | grep -q "$PIPELINE"; then
  ok "Pipeline already exists — skipping create"
else
  SQL="INSERT INTO ${SINK} SELECT * FROM ${STREAM};"
  printf "  ${C_DIM}SQL:${C_RST} %s\n" "$SQL"
  npx wrangler pipelines create "$PIPELINE" --sql "$SQL"
  ok "Pipeline created"
fi

# ── 5 · Verification ───────────────────────────────────────────────
step "5 · Verification"
printf "${C_DIM}── Buckets ──${C_RST}\n"
npx wrangler r2 bucket list 2>/dev/null | grep "$BUCKET" || warn "Bucket not listed"
printf "\n${C_DIM}── Streams ──${C_RST}\n"
npx wrangler pipelines streams list 2>/dev/null | tail -5 || true
printf "\n${C_DIM}── Sinks ──${C_RST}\n"
npx wrangler pipelines sinks list 2>/dev/null | tail -5 || true
printf "\n${C_DIM}── Pipelines ──${C_RST}\n"
npx wrangler pipelines list 2>/dev/null | tail -5 || true

step "Done"
ok "Analytics pipeline provisioned: Worker → $STREAM → $PIPELINE → $SINK → r2://$BUCKET"
printf "\n${C_DIM}Next steps:${C_RST}\n"
printf "  · Add the stream binding to wrangler.jsonc:\n"
printf "      \"pipelines\": [{ \"binding\": \"ANALYTICS\", \"pipeline\": \"$STREAM\" }]\n"
printf "  · In Worker code: env.ANALYTICS.send([{ event: 'page_view', ts: Date.now(), ... }])\n"
printf "  · Re-deploy: npx wrangler pages deploy dist --project-name weathered-night-72f4\n"
