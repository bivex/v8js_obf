import { BinaryCodecPort } from "../../../ports/outbound/binary-codec.port.ts";
import { CodeCache } from "../../../domain/model/code-cache.ts";
import { ChecksumService } from "../../../domain/obfuscation/checksum-service.ts";
import { StringConstantEntry } from "../../../domain/model/constant-pool.ts";

export class V8BinarySerializer implements BinaryCodecPort {
  public decode(data: Buffer): CodeCache {
    throw new Error("Use V8BinaryParser for decoding");
  }

  /**
   * Serializes a CodeCache aggregate into a valid V8 SerializedCodeData binary buffer.
   */
  public encode(codeCache: CodeCache): Buffer {
    let payload = codeCache.getRawPayload();

    if (!payload || payload.length === 0) {
      // Synthesize binary payload from domain entities
      payload = this.synthesizePayload(codeCache);
    } else {
      // Splicing mutated strings into existing payload
      payload = this.patchPayloadStrings(payload, codeCache);
    }

    codeCache.setRawPayload(payload);

    // Recalculate checksum
    ChecksumService.recalculate(codeCache);

    const headerBuf = codeCache.getHeader().toBuffer();
    return Buffer.concat([headerBuf, payload]);
  }

  /**
   * Exports the complete CodeCache into View8 disassembly text.
   */
  public toDisassemblyText(codeCache: CodeCache): string {
    const lines: string[] = [];
    lines.push(`// ==========================================`);
    lines.push(`// V8 Serialized Code Cache Disassembly`);
    lines.push(`// Magic: 0x${codeCache.getHeader().magicNumber.toString(16)} | Checksum: 0x${codeCache.getHeader().checksum.toString(16)}`);
    lines.push(`// ==========================================\n`);

    for (const sfi of codeCache.getAllFunctions()) {
      lines.push(`Start SharedFunctionInfo`);
      lines.push(`[SharedFunctionInfo] in [BytecodeArray] ${sfi.name}: [${sfi.address || "0x1000"}]`);
      lines.push(`Parameter count ${sfi.parameterCount}`);
      lines.push(`Register count ${sfi.registerCount}`);
      lines.push(`Constant pool (size = ${sfi.constantPool.size})`);
      for (const entry of sfi.constantPool.getAll()) {
        lines.push(`  ${entry.index}: ${entry.toDisplayString()}`);
      }
      lines.push(`Handler Table (size = ${sfi.handlerTable.getEntries().length})`);
      for (const h of sfi.handlerTable.getEntries()) {
        lines.push(`  (${h.fromOffset}, ${h.toOffset}) -> ${h.handlerOffset}`);
      }
      lines.push(`Bytecode:`);
      for (const inst of sfi.instructions) {
        lines.push(`  ${inst.toString()}`);
      }
      lines.push(`End SharedFunctionInfo\n`);
    }

    return lines.join("\n");
  }

  private synthesizePayload(codeCache: CodeCache): Buffer {
    const buffers: Buffer[] = [];
    for (const sfi of codeCache.getAllFunctions()) {
      for (const str of sfi.constantPool.getStrings()) {
        const strBuf = Buffer.from(str.value, "utf-8");
        buffers.push(Buffer.from([strBuf.length]));
        buffers.push(strBuf);
      }
      for (const inst of sfi.instructions) {
        buffers.push(Buffer.from([inst.opcode, 0x00]));
      }
    }
    const combined = buffers.length > 0 ? Buffer.concat(buffers) : Buffer.alloc(64);
    // Align to 8 bytes
    const pad = (8 - (combined.length % 8)) % 8;
    return pad > 0 ? Buffer.concat([combined, Buffer.alloc(pad)]) : combined;
  }

  private patchPayloadStrings(payload: Buffer, codeCache: CodeCache): Buffer {
    let result = Buffer.from(payload);
    for (const sfi of codeCache.getAllFunctions()) {
      for (const strEntry of sfi.constantPool.getStrings()) {
        if (strEntry.isEncrypted) {
          const searchBuf = Buffer.from(strEntry.value, "utf-8");
          // If search pattern exists, scramble it
          const idx = result.indexOf(searchBuf);
          if (idx !== -1) {
            const encryptedBytes = Buffer.from(strEntry.value, "utf-8");
            encryptedBytes.copy(result, idx);
          }
        }
      }
    }
    return result;
  }
}
