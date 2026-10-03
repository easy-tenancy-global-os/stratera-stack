// ── functions/lib/wasteAnchor.server-entry.ts ─────────────────────────────
// Bundler entry point for the local-dev Node server (Option A parity).
//
// Re-exports everything from functions/lib/wasteAnchor.ts PLUS the
// XrplWasteAnchorService class itself, so server.mjs can instantiate the
// exact same service the Cloudflare Pages Function uses — no duplicated
// AccountSet-with-Memo submission logic in the local Node adapter.
//
// This file is bundled by scripts/build-waste-anchor.mjs → dist/server/waste-anchor.mjs.
// Do NOT import it directly from the Cloudflare Pages Function; it exists
// solely to widen the export surface for the local Node server.
// ─────────────────────────────────────────────────────────────────────────────

export {
  DEFAULT_TESTNET_WS,
  DEFAULT_TESTNET_FAUCET,
  validateAnchorRequest,
  buildBatch,
  fundEphemeralWallet,
  handleAnchorRequest,
} from './wasteAnchor'

export type {
  WasteAnchorEnv,
  AnchorEventInput,
  AnchorRequestBody,
  AnchorRecordSummary,
  AnchorMerkleSummary,
  AnchorMemoSummary,
  AnchorResponseBody,
  AnchorErrorBody,
} from './wasteAnchor'

// Widened surface: the service class itself (M1.5). server.mjs instantiates
// this directly for the live-mode path so on-chain submission is byte-parity
// with the Cloudflare Pages Function.
export { XrplWasteAnchorService } from '../../src/modules/waste/services/XrplWasteAnchorService'
