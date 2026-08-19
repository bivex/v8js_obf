import { CodeCache } from "../../domain/model/code-cache.ts";
import { PipelineExecutionReport } from "../../domain/obfuscation/obfuscation-pipeline.ts";

export interface ObfuscateOptions {
  profile?: "default" | "light" | "aggressive";
  encryptStrings?: boolean;
  mangleIdentifiers?: boolean;
  scrambleConstants?: boolean;
  injectBytecodeJunk?: boolean;
  controlFlowFlatten?: boolean;
}

export interface ObfuscateCodeCachePort {
  obfuscate(codeCache: CodeCache, options?: ObfuscateOptions): Promise<{
    obfuscatedCache: CodeCache;
    report: PipelineExecutionReport;
  }>;
}
