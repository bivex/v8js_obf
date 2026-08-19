import { AnalyzeCodeCachePort, CodeCacheAnalysisSummary } from "../../ports/inbound/analyze-code-cache.port.ts";
import { CodeCache } from "../../domain/model/code-cache.ts";

export class AnalyzeCodeCacheUseCase implements AnalyzeCodeCachePort {
  public analyze(codeCache: CodeCache): CodeCacheAnalysisSummary {
    const header = codeCache.getHeader();
    const functions = codeCache.getAllFunctions();

    let totalInstructions = 0;
    let totalConstants = 0;
    let stringCount = 0;
    let encryptedStringCount = 0;
    let deadCodeCount = 0;

    for (const sfi of functions) {
      totalInstructions += sfi.instructions.length;
      totalConstants += sfi.constantPool.size;
      const strings = sfi.constantPool.getStrings();
      stringCount += strings.length;
      encryptedStringCount += strings.filter(s => s.isEncrypted).length;
      deadCodeCount += sfi.instructions.filter(i => i.isDeadCode).length;
    }

    // Heuristic security/obfuscation score from 0 to 100
    let score = 10;
    if (encryptedStringCount > 0) score += 30;
    if (deadCodeCount > 0) score += 25;
    if (totalConstants > 5) score += 15;
    if (functions.some(f => f.name.startsWith("_0x"))) score += 20;

    return {
      version: `0x${header.versionHash.toString(16)}`,
      payloadSize: header.payloadLength,
      checksum: `0x${header.checksum.toString(16)}`,
      totalFunctions: functions.length,
      totalInstructions,
      totalConstants,
      stringCount,
      functionSignatures: functions.map(f => f.getSignature()),
      securityScore: Math.min(100, score),
    };
  }
}
