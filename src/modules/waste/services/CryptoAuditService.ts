import { createHash } from 'node:crypto';

export class CryptoAuditService {
  /**
   * Applies XML Exclusive Canonicalization (XML-EXC-C14N) rules:
   * - Normalizes line endings to LF (\n)
   * - Strips inter-element white space
   * - Sorts element attributes lexicographically
   * - Normalizes self-closing tag spacing
   */
  public static canonicalizeXml(xml: string): string {
    let c14n = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove whitespace between tags
    c14n = c14n.replace(/>\s+</g, '><').trim();

    // Alphabetize attributes within start tags
    c14n = c14n.replace(/<([a-zA-Z0-9_:-]+)([^>]+)>/g, (_match, tagName, attrString) => {
      const isSelfClosing = attrString.endsWith('/');
      const cleanAttrs = isSelfClosing ? attrString.slice(0, -1) : attrString;

      const attrRegex = /([a-zA-Z0-9_:-]+)=("[^"]*"|'[^']*')/g;
      const attributes: { name: string; full: string }[] = [];
      let attrMatch: RegExpExecArray | null;

      while ((attrMatch = attrRegex.exec(cleanAttrs)) !== null) {
        attributes.push({ name: attrMatch[1], full: attrMatch[0] });
      }

      attributes.sort((a, b) => a.name.localeCompare(b.name));

      const sortedAttrStr = attributes.map((a) => a.full).join(' ');
      const spacePrefix = sortedAttrStr.length > 0 ? ' ' : '';
      const closing = isSelfClosing ? '/>' : '>';

      return `<${tagName}${spacePrefix}${sortedAttrStr}${closing}`;
    });

    return c14n;
  }

  /**
   * Computes standard SHA3-512 digest in hexadecimal.
   */
  public static sha3_512(data: Buffer | string): string {
    return createHash('sha3-512').update(data).digest('hex');
  }

  /**
   * Domain Separated Merkle Leaf Hash:
   * 0x00 || SHA3-512(canonical_xml)
   */
  public static computeLeafHash(c14nXml: string): string {
    const rawDigestHex = this.sha3_512(c14nXml);
    const prefix = Buffer.from([0x00]);
    const payload = Buffer.from(rawDigestHex, 'hex');
    return this.sha3_512(Buffer.concat([prefix, payload]));
  }

  /**
   * Domain Separated Internal Node Hash:
   * 0x01 || SHA3-512(leftHash || rightHash)
   */
  public static computeMerkleNodeHash(leftHash: string, rightHash: string): string {
    const prefix = Buffer.from([0x01]);
    const children = Buffer.concat([Buffer.from(leftHash, 'hex'), Buffer.from(rightHash, 'hex')]);
    return this.sha3_512(Buffer.concat([prefix, children]));
  }

  /**
   * Domain Separated Root Hash binding Leaf Count:
   * 0x02 || uint32_BE(leafCount) || SHA3-512(internalRootHash)
   */
  public static computeMerkleRootHash(internalRootHash: string, leafCount: number): string {
    const prefix = Buffer.from([0x02]);
    const leafCountBuf = Buffer.alloc(4);
    leafCountBuf.writeUInt32BE(leafCount, 0);
    const rootBuf = Buffer.from(internalRootHash, 'hex');

    return this.sha3_512(Buffer.concat([prefix, leafCountBuf, rootBuf]));
  }
}
