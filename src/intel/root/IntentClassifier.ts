/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/root/IntentClassifier.ts — deterministic intent detection
 *
 *  Rule-based, no LLM. Maps user query text to one of the M1 intents.
 *  New intents are added by extending the RULES table.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Intent =
  | 'analyze.property'
  | 'property.summary'
  | 'unresolved'

interface Rule {
  intent:  Intent
  regexes: RegExp[]
}

const RULES: Rule[] = [
  {
    intent:  'analyze.property',
    regexes: [
      /\banaly[sz]e\b/i,
      /\bdeep[\s-]*dive\b/i,
      /\banalysis\b/i,
      /\bfull[\s-]*picture\b/i,
      /\btell me about\b/i,
    ],
  },
  {
    intent:  'property.summary',
    regexes: [
      /\bsummar/i,
      /\bshow me\b/i,
      /\boverview\b/i,
    ],
  },
]

export interface IntentClassification {
  intent:     Intent
  confidence: 'high' | 'medium' | 'low'
  matched?:   string
}

export function classifyIntent(query: string): IntentClassification {
  const q = query ?? ''
  for (const rule of RULES) {
    for (const re of rule.regexes) {
      const m = q.match(re)
      if (m) return { intent: rule.intent, confidence: 'high', matched: m[0] }
    }
  }
  // If a canonical id or alias is present, default to analyze.property.
  const idLike = /\b(DE|GB|AE|SG|US)-[A-Z]{2,4}-\d+\b|\b(PROP|MKT|OWN)-[A-Z0-9-]+\b/i.exec(q)
  if (idLike) return { intent: 'analyze.property', confidence: 'medium', matched: idLike[0] }
  return { intent: 'unresolved', confidence: 'low' }
}
