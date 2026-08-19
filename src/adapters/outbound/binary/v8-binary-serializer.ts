import { BinaryCodecPort } from "../../../ports/outbound/binary-codec.port.ts";
import { CodeCache } from "../../../domain/model/code-cache.ts";
import { ChecksumService } from "../../../domain/obfuscation/checksum-service.ts";
import { StringConstantEntry } from "../../../domain/model/constant-pool.ts";

export class V8BinarySerializer implements BinaryCodecPort {
  public decode(data: Buffer): CodeCache {
    throw new Error("Use V8BinaryParser for decoding");
  }

  public encode(codeCache: CodeCache): Buffer {
    let payload = codeCache.getRawPayload();

    if (!payload || payload.length === 0) {
      payload = this.synthesizePayload(codeCache);
    } else {
      payload = this.patchPayloadStrings(payload, codeCache);
    }

    codeCache.setRawPayload(payload);
    ChecksumService.recalculate(codeCache);

    const headerBuf = codeCache.getHeader().toBuffer();
    return Buffer.concat([headerBuf, payload]);
  }

  public toDisassemblyText(codeCache: CodeCache): string {
    const lines: string[] = [];

    for (const sfi of codeCache.getAllFunctions()) {
      lines.push(`Start SharedFunctionInfo`);
      const addr = sfi.address || "0x1000";
      lines.push(`${addr}: [SharedFunctionInfo] in [BytecodeArray] ${sfi.name}`);
      lines.push(`Parameter count ${sfi.parameterCount}`);
      lines.push(`Register count ${sfi.registerCount}`);
      lines.push(`Constant pool (size = ${sfi.constantPool.size})`);
      lines.push(`- length: ${sfi.constantPool.size}`);
      for (const entry of sfi.constantPool.getAll()) {
        const val = entry instanceof StringConstantEntry 
          ? `<String[${entry.value.length}]: #${entry.value} >`
          : entry.toDisplayString();
        lines.push(`${entry.index}: ${addr} ${val}`);
      }
      lines.push(`Handler Table (size = ${sfi.handlerTable.getEntries().length})`);
      for (const h of sfi.handlerTable.getEntries()) {
        lines.push(`(${h.fromOffset},${h.toOffset})  -> ${h.handlerOffset} (0x0)`);
      }
      lines.push(`Bytecode:`);
      for (const inst of sfi.instructions) {
        const ops = inst.operands.map(o => typeof o === "number" ? `[${o}]` : o.toString()).join(", ");
        lines.push(`         @    ${inst.offset} : 00 00       ${inst.mnemonic} ${ops}`.trimEnd());
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
    const pad = (8 - (combined.length % 8)) % 8;
    return pad > 0 ? Buffer.concat([combined, Buffer.alloc(pad)]) : combined;
  }

  private patchPayloadStrings(payload: Buffer, codeCache: CodeCache): Buffer {
    let result = Buffer.from(payload);
    for (const sfi of codeCache.getAllFunctions()) {
      for (const strEntry of sfi.constantPool.getStrings()) {
        if (strEntry.isEncrypted) {
          const searchBuf = Buffer.from(strEntry.value, "utf-8");
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
