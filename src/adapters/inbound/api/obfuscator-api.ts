import { ParseCodeCacheUseCase } from "../../../application/use-cases/parse-code-cache.usecase.ts";
import { SerializeCodeCacheUseCase } from "../../../application/use-cases/serialize-code-cache.usecase.ts";
import { ObfuscateCodeCacheUseCase } from "../../../application/use-cases/obfuscate-code-cache.usecase.ts";
import { AnalyzeCodeCacheUseCase } from "../../../application/use-cases/analyze-code-cache.usecase.ts";
import { CompileScriptUseCase } from "../../../application/use-cases/compile-script.usecase.ts";
import { VerifyCodeCacheUseCase } from "../../../application/use-cases/verify-code-cache.usecase.ts";
import { FileSystemAdapter } from "../../outbound/storage/file-system.adapter.ts";
import { V8BinaryParser } from "../../outbound/binary/v8-binary-parser.ts";
import { V8BinarySerializer } from "../../outbound/binary/v8-binary-serializer.ts";
import { NodeVmAdapter } from "../../outbound/runtime/node-vm.adapter.ts";
import { CodeCache } from "../../../domain/model/code-cache.ts";
import { ObfuscateOptions } from "../../../ports/inbound/obfuscate-code-cache.port.ts";

/**
 * Fluent API façade uniting all Hexagonal Ports and Use Cases.
 */
export class V8ObfuscatorApi {
  private readonly storage = new FileSystemAdapter();
  private readonly parser = new V8BinaryParser();
  private readonly serializer = new V8BinarySerializer();
  private readonly runtime = new NodeVmAdapter();

  public readonly parseUseCase = new ParseCodeCacheUseCase(this.storage, this.parser, this.parser);
  public readonly serializeUseCase = new SerializeCodeCacheUseCase(this.storage, this.serializer, this.serializer);
  public readonly obfuscateUseCase = new ObfuscateCodeCacheUseCase();
  public readonly analyzeUseCase = new AnalyzeCodeCacheUseCase();
  public readonly compileUseCase = new CompileScriptUseCase(this.runtime, this.parser);
  public readonly verifyUseCase = new VerifyCodeCacheUseCase(this.runtime, this.serializer);

  public static create(): V8ObfuscatorApi {
    return new V8ObfuscatorApi();
  }

  /**
   * Compiles source code, obfuscates it, and exports the obfuscated code cache buffer.
   */
  public async obfuscateScript(
    sourceCode: string,
    options?: ObfuscateOptions
  ): Promise<{ obfuscatedBuffer: Buffer; disassembly: string; stats: any }> {
    const { codeCache } = await this.compileUseCase.compile(sourceCode);
    const { obfuscatedCache, report } = await this.obfuscateUseCase.obfuscate(codeCache, options);
    const obfuscatedBuffer = await this.serializeUseCase.serializeToBuffer(obfuscatedCache);
    const disassembly = this.serializeUseCase.serializeToDisassemblyText(obfuscatedCache);
    const stats = this.analyzeUseCase.analyze(obfuscatedCache);

    return {
      obfuscatedBuffer,
      disassembly,
      stats: { ...stats, mutationsApplied: report.totalMutationsApplied },
    };
  }
}
