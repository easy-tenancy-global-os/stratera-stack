/**
 * StatelessNonceManager
 *
 * Generates and validates HMAC-SHA256 signed Base64URL nonces with:
 * - configurable TTL (seconds)
 * - optional allowedFutureSkew (seconds) to allow small clock differences
 * - constant-time signature comparison using crypto.timingSafeEqual
 * - optional client ID binding
 *
 * Nonce format:
 *   base64url(JSON({ ts, cid? })) + '.' + base64url(hmac)
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export interface StatelessNonceManagerOptions {
  secret: string | Buffer;
  ttlSeconds?: number; // default 60
  allowedFutureSkewSeconds?: number; // default 10
  hmacAlgorithm?: 'sha256'; // fixed to sha256 per requirements
}

export interface NonceValidationResult {
  valid: boolean;
  reason?: 'invalid-format' | 'invalid-signature' | 'expired' | 'client-id-mismatch' | 'future-ts' | 'ok';
  timestamp?: number;
  clientId?: string | null;
}

const BASE64URL = {
  encode(buf: Buffer) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  },
  decode(str: string) {
    const pad = 4 - (str.length % 4);
    const padded = str + (pad < 4 ? '='.repeat(pad) : '');
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(b64, 'base64');
  },
};

export class StatelessNonceManager {
  private secret: Buffer;
  private ttlSeconds: number;
  private allowedFutureSkewSeconds: number;
  private hmacAlgorithm: 'sha256';

  constructor(opts: StatelessNonceManagerOptions) {
    if (!opts?.secret) throw new TypeError('StatelessNonceManager requires a secret');
    this.secret = Buffer.isBuffer(opts.secret) ? opts.secret : Buffer.from(String(opts.secret), 'utf8');
    this.ttlSeconds = typeof opts.ttlSeconds === 'number' ? opts.ttlSeconds : 60;
    this.allowedFutureSkewSeconds = typeof opts.allowedFutureSkewSeconds === 'number' ? opts.allowedFutureSkewSeconds : 10;
    this.hmacAlgorithm = opts.hmacAlgorithm ?? 'sha256';
  }

  /**
   * Generate a nonce bound optionally to clientId.
   * Optionally pass epochSeconds to create nonces with a custom timestamp (useful for tests).
   */
  generate(clientId?: string | null, epochSeconds?: number): string {
    const ts = typeof epochSeconds === 'number' ? Math.floor(epochSeconds) : Math.floor(Date.now() / 1000);
    const payloadObj: { ts: number; cid?: string } = { ts };
    if (clientId) payloadObj.cid = clientId;
    const payloadJson = JSON.stringify(payloadObj);
    const payloadBuf = Buffer.from(payloadJson, 'utf8');
    const sig = this.hmac(payloadBuf);
    return `${BASE64URL.encode(payloadBuf)}.${BASE64URL.encode(sig)}`;
  }

  /**
   * Validate a nonce; optionally require a clientId binding.
   */
  validate(nonce: string, expectedClientId?: string | null): NonceValidationResult {
    if (!nonce || typeof nonce !== 'string') return { valid: false, reason: 'invalid-format' };

    const parts = nonce.split('.');
    if (parts.length !== 2) return { valid: false, reason: 'invalid-format' };

    let payloadBuf: Buffer;
    let sigBuf: Buffer;
    try {
      payloadBuf = BASE64URL.decode(parts[0]);
      sigBuf = BASE64URL.decode(parts[1]);
    } catch {
      return { valid: false, reason: 'invalid-format' };
    }

    const expectedSig = this.hmac(payloadBuf);

    // timing-safe compare requires equal lengths
    if (sigBuf.length !== expectedSig.length) {
      const minLen = Math.min(sigBuf.length, expectedSig.length);
      const a = Buffer.concat([sigBuf.slice(0, minLen), Buffer.alloc(expectedSig.length - minLen)]);
      const b = expectedSig;
      try {
        timingSafeEqual(a, b);
      } catch {
        // ignore
      }
      return { valid: false, reason: 'invalid-signature' };
    }

    try {
      if (!timingSafeEqual(sigBuf, expectedSig)) {
        return { valid: false, reason: 'invalid-signature' };
      }
    } catch {
      return { valid: false, reason: 'invalid-signature' };
    }

    let payload: { ts: number; cid?: string };
    try {
      payload = JSON.parse(payloadBuf.toString('utf8'));
    } catch {
      return { valid: false, reason: 'invalid-format' };
    }

    const now = Math.floor(Date.now() / 1000);
    const ts = Math.floor(payload.ts);
    if (!Number.isFinite(ts)) return { valid: false, reason: 'invalid-format' };

    if (ts - now > this.allowedFutureSkewSeconds) {
      return { valid: false, reason: 'future-ts', timestamp: ts, clientId: payload.cid ?? null };
    }

    if (now - ts > this.ttlSeconds) {
      return { valid: false, reason: 'expired', timestamp: ts, clientId: payload.cid ?? null };
    }

    if (expectedClientId != null) {
      const cid = payload.cid ?? null;
      if (cid !== expectedClientId) {
        return { valid: false, reason: 'client-id-mismatch', timestamp: ts, clientId: cid };
      }
    }

    return { valid: true, reason: 'ok', timestamp: ts, clientId: payload.cid ?? null };
  }

  private hmac(payload: Buffer): Buffer {
    const h = createHmac(this.hmacAlgorithm, this.secret);
    h.update(payload);
    return h.digest();
  }

  static createRandomSecret(bytes = 32) {
    return randomBytes(bytes);
  }
}
