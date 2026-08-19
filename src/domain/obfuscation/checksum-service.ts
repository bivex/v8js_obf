import { CodeCache } from "../model/code-cache.ts";
import { ChecksumRecalculatedEvent } from "../events/domain-events.ts";

/**
 * Domain Service for recalculating V8 integrity checksums.
 * V8 uses custom Adler-32 / CRC32 variants across the SerializedCodeData payload.
 */
export class ChecksumService {
  /**
   * Calculate standard Adler-32 checksum of a buffer.
   */
  public static calculateAdler32(buf: Buffer | Uint8Array): number {
    let a = 1;
    let b = 0;
    const MOD_ADLER = 65521;

    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % MOD_ADLER;
      b = (b + a) % MOD_ADLER;
    }

    return ((b << 16) | a) >>> 0;
  }

  /**
   * Recalculates and updates the checksum in the CodeCache Header.
   */
  public static recalculate(codeCache: CodeCache): ChecksumRecalculatedEvent {
    const rawPayload = codeCache.getRawPayload();
    const oldChecksum = codeCache.getHeader().checksum;

    let newChecksum = 0;
    if (rawPayload && rawPayload.length > 0) {
      newChecksum = this.calculateAdler32(rawPayload);
    } else {
      // Synthesize deterministic checksum from functions structure
      const hashData = Buffer.from(JSON.stringify(codeCache.toJSON()));
      newChecksum = this.calculateAdler32(hashData);
    }

    const updatedHeader = codeCache.getHeader().withChecksum(newChecksum);
    codeCache.updateHeader(updatedHeader);

    return new ChecksumRecalculatedEvent({
      oldChecksum,
      newChecksum,
      algorithm: "Adler32",
    });
  }
}
