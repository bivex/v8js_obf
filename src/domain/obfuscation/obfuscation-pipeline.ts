import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { ChecksumService } from "./checksum-service.ts";
import { StringEncryptorMutator } from "./string-encryptor-mutator.ts";
import { IdentifierManglerMutator } from "./identifier-mangler-mutator.ts";
import { ConstantScramblerMutator } from "./constant-scrambler-mutator.ts";
import { BytecodeJunkMutator } from "./bytecode-junk-mutator.ts";
import { ControlFlowMutator } from "./control-flow-mutator.ts";
import { MixedBooleanArithmeticMutator } from "./mba-mutator.ts";
import { OpaquePredicateMutator } from "./opaque-predicate-mutator.ts";
import { HandlerTableAntiDisassemblyMutator } from "./handler-table-mutator.ts";
import { FunctionFissionFusionMutator } from "./fission-fusion-mutator.ts";
import { SelfChecksummingAntiTamperMutator } from "./self-checksum-mutator.ts";
import { DomainEvent } from "../events/domain-events.ts";

export interface PipelineExecutionReport {
  timestamp: Date;
  totalMutationsApplied: number;
  mutatorReports: MutatorResult[];
  events: DomainEvent[];
  oldChecksum: number;
  newChecksum: number;
}

export class ObfuscationPipeline {
  private mutators: Array<{ mutator: BaseMutator; options?: MutatorOptions }> = [];

  public static createDefault(): ObfuscationPipeline {
    return new ObfuscationPipeline()
      .add(new StringEncryptorMutator())
      .add(new IdentifierManglerMutator())
      .add(new ConstantScramblerMutator())
      .add(new BytecodeJunkMutator());
  }

  public static createAggressive(): ObfuscationPipeline {
    return new ObfuscationPipeline()
      .add(new StringEncryptorMutator(), { encryptionMode: "xor", key: 0x7f })
      .add(new IdentifierManglerMutator(), { prefix: "_0x_v8_" })
      .add(new ConstantScramblerMutator(), { dummyConstantsPerFunction: 5 })
      .add(new FunctionFissionFusionMutator())
      .add(new MixedBooleanArithmeticMutator())
      .add(new OpaquePredicateMutator())
      .add(new BytecodeJunkMutator(), { junkInstructionsPerFunction: 4 })
      .add(new ControlFlowMutator())
      .add(new SelfChecksummingAntiTamperMutator())
      .add(new HandlerTableAntiDisassemblyMutator());
  }

  public add(mutator: BaseMutator, options?: MutatorOptions): this {
    this.mutators.push({ mutator, options });
    return this;
  }

  public execute(codeCache: CodeCache): PipelineExecutionReport {
    const oldChecksum = codeCache.getHeader().checksum;
    const mutatorReports: MutatorResult[] = [];
    const allEvents: DomainEvent[] = [];
    let totalMutationsApplied = 0;

    for (const { mutator, options } of this.mutators) {
      if (options?.enabled === false) continue;
      const result = mutator.mutate(codeCache, options);
      mutatorReports.push(result);
      allEvents.push(...result.events);
      totalMutationsApplied += result.mutationsApplied;
    }

    // Always recalculate checksum after mutation
    const checksumEvent = ChecksumService.recalculate(codeCache);
    allEvents.push(checksumEvent);

    return {
      timestamp: new Date(),
      totalMutationsApplied,
      mutatorReports,
      events: allEvents,
      oldChecksum,
      newChecksum: codeCache.getHeader().checksum,
    };
  }
}
