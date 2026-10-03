/**
 * tools/catalog/index.ts — one-shot registration entry point
 *
 * Import and call `registerAllTools()` once at Intelligence Root boot to
 * populate the ToolRegistry with the M1 tool set.
 */

import { registerPropertyTools } from './property'
import { registerFinanceTools }  from './finance'
import { registerMarketTools }   from './market'
import { registerPredictiveTools } from './predictive'

let registered = false

export function registerAllTools(): void {
  if (registered) return
  registerPropertyTools()
  registerFinanceTools()
  registerMarketTools()
  registerPredictiveTools()
  registered = true
}

/** Test helper — allows tests to force re-registration. */
export function _resetToolCatalogRegisteredFlag(): void {
  registered = false
}
