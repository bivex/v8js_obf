import { ObfuscateCodeCachePort, ObfuscateOptions } from "../../ports/inbound/obfuscate-code-cache.port.ts";
import { CodeCache } from "../../domain/model/code-cache.ts";
import { ObfuscationPipeline, PipelineExecutionReport } from "../../domain/obfuscation/obfuscation-pipeline.ts";
import { StringEncryptorMutator } from "../../domain/obfuscation/string-encryptor-mutator.ts";
import { IdentifierManglerMutator } from "../../domain/obfuscation/identifier-mangler-mutator.ts";
import { ConstantScramblerMutator } from "../../domain/obfuscation/constant-scrambler-mutator.ts";
import { BytecodeJunkMutator } from "../../domain/obfuscation/bytecode-junk-mutator.ts";
import { ControlFlowMutator } from "../../domain/obfuscation/control-flow-mutator.ts";

export class ObfuscateCodeCacheUseCase implements ObfuscateCodeCachePort {
  public async obfuscate(
    codeCache: CodeCache,
    options?: ObfuscateOptions
  ): Promise<{ obfuscatedCache: CodeCache; report: PipelineExecutionReport }> {
    const pipeline = new ObfuscationPipeline();

    if (options?.profile === "aggressive") {
      return {
        obfuscatedCache: codeCache,
        report: ObfuscationPipeline.createAggressive().execute(codeCache),
      };
    }

    // Configure mutators based on options
    if (options?.encryptStrings !== false) {
      pipeline.add(new StringEncryptorMutator());
    }
    if (options?.mangleIdentifiers !== false) {
      pipeline.add(new IdentifierManglerMutator());
    }
    if (options?.scrambleConstants !== false) {
      pipeline.add(new ConstantScramblerMutator());
    }
    if (options?.injectBytecodeJunk !== false) {
      pipeline.add(new BytecodeJunkMutator());
    }
    if (options?.controlFlowFlatten === true) {
      pipeline.add(new ControlFlowMutator());
    }

    const report = pipeline.execute(codeCache);
    return { obfuscatedCache: codeCache, report };
  }
}
