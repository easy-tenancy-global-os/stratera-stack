# Analytics Pipeline · easy-tenancy-analytics

**v4.8.2** · Cloudflare R2 + Pipelines provisioning runbook

## What this provisions

```
Worker (Pages)
    │
    │  env.ANALYTICS.send([{ event, ts, ... }])
    ▼
Stream:   easy-tenancy-events       (HTTP-enabled, auth required)
    │
    ▼
Pipeline: easy-tenancy-analytics    (SQL: INSERT INTO sink SELECT * FROM stream)
    │
    ▼
Sink:     easy-tenancy-r2-sink      (parquet · gzip · 10 MB roll · 30 s roll)
    │
    ▼
R2:       easy-tenancy-analytics    (bucket)
              └── events/year=YYYY/month=MM/day=DD/hour=HH/*.parquet.gz
```

## Why three commands instead of one

The legacy command set you sent:

```bash
npx wrangler r2 bucket create easy-tenancy-analytics
npx wrangler pipelines create easy-tenancy-analytics \
  --r2-bucket easy-tenancy-analytics \
  --batch-max-mb 10 \
  --batch-max-seconds 30 \
  --compression gzip \
  --output-format parquet
```

…targets the **legacy single-step Pipelines API** (pre-2026 Q1).

Wrangler **4.83.0** redesigned the API into a **Stream → Sink → Pipeline (SQL)** model. The `--r2-bucket / --batch-max-* / --compression / --output-format` flags no longer exist on `pipelines create` — they now live on `pipelines sinks create`, and the pipeline itself is a SQL query connecting stream to sink.

## Flag translation map

| Legacy flag (your command) | New API location |
|---|---|
| `pipelines create <name> --r2-bucket X` | `pipelines sinks create <sink> --type r2 --bucket X` |
| `--batch-max-mb 10` | `sinks create … --roll-size 10` |
| `--batch-max-seconds 30` | `sinks create … --roll-interval 30` |
| `--compression gzip` | `sinks create … --compression gzip` |
| `--output-format parquet` | `sinks create … --format parquet` |
| *(implicit: stream)* | `pipelines streams create <stream>` *(new explicit step)* |
| *(implicit: SQL glue)* | `pipelines create <name> --sql "INSERT INTO <sink> SELECT * FROM <stream>"` |

## Run it

```bash
# Once token scopes are granted:
npm run analytics:provision

# Check status anytime:
npm run analytics:status
```

The script is **idempotent** — it skips any resource that already exists, so re-runs are safe.

## Token scopes required

The current CF API token has `Pages: Edit` but is **missing**:

| Scope | Needed for |
|---|---|
| **Account · Workers R2 Storage · Edit** | `r2 bucket create` |
| **Account · Workers Pipelines · Edit** | `pipelines streams/sinks/create` |
| Account · Account Settings · Read *(optional)* | `whoami` to show account name |
| User · User Details · Read *(optional)* | `whoami` to show email |
| User · Memberships · Read *(optional)* | `whoami` to show membership roles |

### How to add scopes

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Find the token (or create a new one)
3. Edit → add the two **Edit** scopes above → Save
4. Re-run `npm run analytics:provision`

## After provisioning succeeds

1. **Uncomment the binding** in `wrangler.jsonc`:
   ```jsonc
   "pipelines": [
     { "binding": "ANALYTICS", "pipeline": "easy-tenancy-events" }
   ]
   ```

2. **Regenerate types**:
   ```bash
   npm run cf-typegen
   ```

3. **Send events from Worker code**:
   ```typescript
   // src/worker.ts (or any Hono route)
   app.post('/api/track', async (c) => {
     await c.env.ANALYTICS.send([
       { event: 'page_view', ts: Date.now(), path: c.req.path,
         ua: c.req.header('user-agent') ?? '' }
     ])
     return c.json({ ok: true })
   })
   ```

4. **Deploy**:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name weathered-night-72f4
   ```

## Querying the data

Parquet files in R2 can be queried directly via:

- **Cloudflare R2 Data Catalog** (Apache Iceberg, no compute setup)
- **DuckDB**: `SELECT * FROM 's3://easy-tenancy-analytics/events/**/*.parquet'`
- **ClickHouse Cloud**, **Snowflake external tables**, **AWS Athena** — all support R2 Parquet via S3-compatible endpoint

## Cost model (Cloudflare Pipelines, June 2026)

- Pipelines: **First 10 GB ingress/month free** · then $0.05/GB
- R2 storage: **$0.015/GB-month** (no egress fees on Cloudflare network)
- R2 Class A ops (writes): **$4.50 per million** — with 30 s roll @ 1 stream = ~3,000 writes/day = $0.40/month

For a typical PropTech analytics workload of ~5 GB/month events:
**Total: ~$0.50/month** (vs Datadog/Mixpanel at $50–500/month for the same volume)
