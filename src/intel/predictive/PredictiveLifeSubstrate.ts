/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/predictive/PredictiveLifeSubstrate.ts
 *
 *  Substrate interface for forward-looking forecasts. In M1 we ship only
 *  the vacancy baseline (EWMA) — labeled experimental per amendment #5.
 *
 *  Future forecasters (Rent · Renewal · Failure · Value · Energy · Cashflow
 *  · Default · CapEx · Lifecycle) plug into this same interface without
 *  changing the ToolGateway or the agents.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Forecaster interface (v0) ──────────────────────────────────────────────
export interface Forecaster<TSeries, TForecast> {
  readonly model:   string     // e.g. 'VacancyBaseline-EWMA-v0'
  readonly method:  string     // e.g. 'EWMA'
  readonly status:  'experimental-baseline' | 'production'
  /**
   * Compute a forecast. `steps` is the number of forward steps.
   * The baseline implementations return an array of length `steps`.
   */
  forecast(series: TSeries, steps: number): TForecast[]
}

// ── VacancyBaseline-EWMA-v0 ────────────────────────────────────────────────
export interface OccupancySeries {
  live: number
  d30:  number
  d90:  number
  y1:   number
}

/**
 * EWMA baseline. Not a production model. Returns vacancy % (= 100 − occupancy)
 * at each forecast step, holding the smoothed occupancy flat.
 *
 * Smoothing factor α is fixed to 0.4. Historical order chosen from oldest to
 * newest (y1 → d90 → d30 → live), so the EWMA weight of the freshest sample
 * dominates.
 */
export function vacancyBaselineForecast(series: OccupancySeries, steps: number): number[] {
  const alpha = 0.4
  const orderedOldToNew = [series.y1, series.d90, series.d30, series.live]
  let ewma = orderedOldToNew[0]
  for (let i = 1; i < orderedOldToNew.length; i += 1) {
    ewma = alpha * orderedOldToNew[i] + (1 - alpha) * ewma
  }
  const smoothedOccupancy = ewma
  const smoothedVacancy = Math.max(0, Math.min(100, 100 - smoothedOccupancy))
  // Baseline: flat projection (no trend or seasonality).
  return Array.from({ length: steps }, () => +smoothedVacancy.toFixed(3))
}

export const VacancyForecaster: Forecaster<OccupancySeries, number> = {
  model:  'VacancyBaseline-EWMA-v0',
  method: 'EWMA',
  status: 'experimental-baseline',
  forecast: vacancyBaselineForecast,
}
