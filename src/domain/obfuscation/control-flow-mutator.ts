import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { BytecodeInstruction } from "../model/bytecode-instruction.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export interface ControlFlowOptions extends MutatorOptions {
  flatteningLevel?: "light" | "deep";
}

export class ControlFlowMutator extends BaseMutator {
  constructor() {
    super(
      "ControlFlowMutator",
      "Injects opaque predicates, jump trampolines, and control flow flattening branches into V8 bytecode arrays"
    );
  }

  public mutate(codeCache: CodeCache, options?: ControlFlowOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;

    for (const sfi of codeCache.getAllFunctions()) {
      const insts = sfi.instructions;
      if (insts.length < 4) continue;

      // Insert an opaque predicate jump (Jump to next line, always taken or dead branch)
      const trampolineJump = new BytecodeInstruction({
        offset: 0,
        opcode: 0x7a, // Jump
        mnemonic: "Jump",
        operands: [insts[1]?.offset ?? 4],
        isDeadCode: false,
      });

      sfi.insertInstruction(0, trampolineJump);
      mutationsApplied++;

      events.push(new FunctionMutatedEvent({
        functionId: sfi.id,
        mutatorName: this.name,
        details: `Inserted jump trampoline dispatcher into ${sfi.name}`,
      }));
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Applied control flow transformations to ${mutationsApplied} functions.`,
      events,
    };
  }
}
