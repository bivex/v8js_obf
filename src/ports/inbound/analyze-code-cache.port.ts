import { CodeCache } from "../../domain/model/code-cache.ts";

export interface CodeCacheAnalysisSummary {
  version: string;
  payloadSize: number;
  checksum: string;
  totalFunctions: number;
  totalInstructions: number;
  totalConstants: number;
  stringCount: number;
  functionSignatures: string[];
  securityScore: number; // 0 (unobfuscated) to 100 (heavily obfuscated)
}

export interface AnalyzeCodeCachePort {
  analyze(codeCache: CodeCache): CodeCacheAnalysisSummary;
}
