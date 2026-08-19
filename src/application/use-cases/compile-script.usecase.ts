import { RuntimeExecutorPort } from "../../ports/outbound/runtime-executor.port.ts";
import { CodeCache } from "../../domain/model/code-cache.ts";
import { BinaryCodecPort } from "../../ports/outbound/binary-codec.port.ts";

export class CompileScriptUseCase {
  constructor(
    private readonly runtimeExecutor: RuntimeExecutorPort,
    private readonly binaryCodec: BinaryCodecPort
  ) {}

  public async compile(sourceCode: string): Promise<{ codeCache: CodeCache; rawBuffer: Buffer }> {
    const { codeCacheBuffer } = await this.runtimeExecutor.compileToCodeCache(sourceCode);
    const codeCache = this.binaryCodec.decode(codeCacheBuffer);
    codeCache.setSourceSnippet(sourceCode);
    return { codeCache, rawBuffer: codeCacheBuffer };
  }
}
