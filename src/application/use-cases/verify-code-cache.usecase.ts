import { RuntimeExecutorPort, ExecutionResult } from "../../ports/outbound/runtime-executor.port.ts";
import { BinaryCodecPort } from "../../ports/outbound/binary-codec.port.ts";
import { CodeCache } from "../../domain/model/code-cache.ts";

export class VerifyCodeCacheUseCase {
  constructor(
    private readonly runtimeExecutor: RuntimeExecutorPort,
    private readonly binaryCodec: BinaryCodecPort
  ) {}

  public async verify(sourceCode: string, codeCache: CodeCache): Promise<ExecutionResult> {
    const buffer = this.binaryCodec.encode(codeCache);
    return this.runtimeExecutor.executeWithCodeCache(sourceCode, buffer);
  }
}
