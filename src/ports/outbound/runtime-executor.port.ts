export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  cachedDataRejected?: boolean;
  executionTimeMs: number;
}

export interface RuntimeExecutorPort {
  compileToCodeCache(sourceCode: string): Promise<{ codeCacheBuffer: Buffer; sourceCode: string }>;
  executeWithCodeCache(sourceCode: string, codeCacheBuffer: Buffer): Promise<ExecutionResult>;
}
