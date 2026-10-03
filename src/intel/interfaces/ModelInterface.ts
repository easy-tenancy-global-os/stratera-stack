/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/interfaces/ModelInterface.ts — provider-agnostic model contract
 *
 *  Per M1 amendment #2: the deterministic implementation is the reference
 *  implementation. An LLM is optional, feature-flagged, and only used to
 *  paraphrase structured tool results — never to fetch data.
 *
 *  Per amendment #3: the architecture is always
 *
 *      LLM → Agent → ToolGateway → Domain Service → Data
 *
 *  never
 *
 *      LLM → entities.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * A grounded synthesis input: the structured, tool-derived findings plus
 * the original user query. Adapters may only rephrase these findings;
 * they must never fabricate facts.
 */
export interface SynthesisInput {
  query:    string
  findings: string[]        // pre-composed factual bullets from tool results
  caveats:  string[]        // baseline/experimental notes (must be preserved)
}

/**
 * A synthesis output: the natural-language answer + an explicit tag of
 * which adapter produced it (so provenance is faithful).
 */
export interface SynthesisOutput {
  answer:       string
  model:        string      // 'deterministic' or e.g. 'openai:gpt-4o-mini'
  modelVersion: string      // e.g. 'v0' or the API-reported version
}

/**
 * The Model contract. Every adapter is expected to be side-effect free
 * except for its own network calls. Deterministic adapter has no network.
 */
export interface ModelInterface {
  /** Adapter identifier ('deterministic', 'openai', 'null', etc.). */
  readonly id: string
  /** Human-readable label. */
  readonly label: string
  /** True when this adapter contacts an external service. */
  readonly external: boolean
  /** Produce a grounded synthesis. Throws only on infrastructure failures. */
  synthesize(input: SynthesisInput): Promise<SynthesisOutput>
}
