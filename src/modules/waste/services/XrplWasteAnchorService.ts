import { Client, Wallet } from 'xrpl';
import type { ProcessedDisposalRecord } from '../types/waste';
import { CryptoAuditService } from './CryptoAuditService';

export interface XrplAnchorConfig {
  nodeUrl: string;
  secretSeed: string;
  timeoutMs?: number;
}

export interface BatchAnchorRequest {
  buildingId: string;
  batchId: string;
  records: ProcessedDisposalRecord[];
}

export interface XrplWasteMemoPayload {
  protocol: 'ESTATE_OS_SDMX_WASTE_V1';
  buildingId: string;
  batchId: string;
  merkleRootHash: string;
  internalRootHash: string;
  leafCount: number;
  timestamp: string;
}

export interface SignedWasteMemo {
  Memo: {
    MemoType: string;
    MemoFormat: string;
    MemoData: string;
  };
}

export interface XrplAnchorResult {
  txHash: string;
  ledgerIndex: number;
  merkleRootHash: string;
  leafCount: number;
  anchoredAt: string;
  status: 'tesSUCCESS' | string;
  validated: boolean;
}

export class XrplWasteAnchorService {
  private readonly config: Required<XrplAnchorConfig>;

  constructor(config: XrplAnchorConfig) {
    this.config = {
      timeoutMs: 20000,
      ...config,
    };
  }

  public static stringToHex(str: string): string {
    return Buffer.from(str, 'utf8').toString('hex').toUpperCase();
  }

  public static hexToString(hex: string): string {
    return Buffer.from(hex, 'hex').toString('utf8');
  }

  public buildBatchMerkleTree(records: ProcessedDisposalRecord[]): {
    merkleRootHash: string;
    internalRootHash: string;
    leafHashes: string[];
  } {
    if (records.length === 0) {
      throw new Error('[XrplWasteAnchorService] Cannot build Merkle Tree from empty record batch.');
    }

    const leafHashes = records.map((rec) => rec.auditProof.merkleLeafHash);

    if (leafHashes.length === 1) {
      const internalRootHash = leafHashes[0];
      const merkleRootHash = CryptoAuditService.computeMerkleRootHash(internalRootHash, 1);
      return { merkleRootHash, internalRootHash, leafHashes };
    }

    let currentLevel: string[] = [...leafHashes];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parentHash = CryptoAuditService.computeMerkleNodeHash(left, right);
        nextLevel.push(parentHash);
      }

      currentLevel = nextLevel;
    }

    const internalRootHash = currentLevel[0];
    const merkleRootHash = CryptoAuditService.computeMerkleRootHash(internalRootHash, records.length);

    return { merkleRootHash, internalRootHash, leafHashes };
  }

  public createXrplMemo(payload: XrplWasteMemoPayload): SignedWasteMemo {
    const memoType = 'estate-os/sdmx-waste-root/v1';
    const memoFormat = 'application/json';
    const memoData = JSON.stringify(payload);

    return {
      Memo: {
        MemoType: XrplWasteAnchorService.stringToHex(memoType),
        MemoFormat: XrplWasteAnchorService.stringToHex(memoFormat),
        MemoData: XrplWasteAnchorService.stringToHex(memoData),
      },
    };
  }

  public async anchorWasteBatch(request: BatchAnchorRequest): Promise<XrplAnchorResult> {
    const client = new Client(this.config.nodeUrl, {
      timeout: this.config.timeoutMs,
    });

    try {
      await client.connect();
      const wallet = Wallet.fromSeed(this.config.secretSeed);

      const { merkleRootHash, internalRootHash } = this.buildBatchMerkleTree(request.records);

      const memoPayload: XrplWasteMemoPayload = {
        protocol: 'ESTATE_OS_SDMX_WASTE_V1',
        buildingId: request.buildingId,
        batchId: request.batchId,
        merkleRootHash,
        internalRootHash,
        leafCount: request.records.length,
        timestamp: new Date().toISOString(),
      };

      const memo = this.createXrplMemo(memoPayload);

      const preparedTx = await client.autofill({
        TransactionType: 'AccountSet',
        Account: wallet.address,
        Memos: [memo],
      });

      const signed = wallet.sign(preparedTx);
      const response = await client.submitAndWait(signed.tx_blob);

      const meta = response.result.meta;
      const resultCode = typeof meta === 'object' && meta !== null && 'TransactionResult' in meta
        ? (meta.TransactionResult as string)
        : 'unknown';

      if (resultCode !== 'tesSUCCESS') {
        throw new Error(`[XrplWasteAnchorService] XRPL submission failed with code: ${resultCode}`);
      }

      return {
        txHash: response.result.hash,
        ledgerIndex: response.result.ledger_index ?? 0,
        merkleRootHash,
        leafCount: request.records.length,
        anchoredAt: memoPayload.timestamp,
        status: resultCode,
        validated: response.result.validated ?? false,
      };
    } finally {
      if (client.isConnected()) {
        await client.disconnect();
      }
    }
  }
}
