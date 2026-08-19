import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { BytecodeInstruction, BytecodeRegister } from "../model/bytecode-instruction.ts";
import { DomainEvent, JunkInjectedEvent } from "../events/domain-events.ts";

export interface BytecodeJunkOptions extends MutatorOptions {
  junkInstructionsPerFunction?: number;
}

export class BytecodeJunkMutator extends BaseMutator {
  constructor() {
    super(
      "BytecodeJunkMutator",
      "Injects dead opcode instructions (e.g. Nop, dead register stores) into bytecode streams without altering execution output"
    );
  }

  public mutate(codeCache: CodeCache, options?: BytecodeJunkOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;
    const junkCount = options?.junkInstructionsPerFunction ?? 2;

    for (const sfi of codeCache.getAllFunctions()) {
      const originalInsts = sfi.instructions;
      if (originalInsts.length === 0) continue;

      // Expand register count if necessary to allocate dead register
      const deadRegIndex = sfi.registerCount + 1;
      sfi.setRegisterCount(deadRegIndex + 1);

      let injectedForFunction = 0;
      for (let j = 0; j < junkCount; j++) {
        // Create dead instructions
        const deadNop = new BytecodeInstruction({
          offset: 0,
          opcode: 0x00, // Nop
          mnemonic: "Nop",
          operands: [],
          isDeadCode: true,
        });

        // Insert near the top or middle
        const insertIdx = Math.min(originalInsts.length - 1, j * 2 + 1);
        sfi.insertInstruction(insertIdx, deadNop);
        mutationsApplied++;
        injectedForFunction++;
      }

      events.push(new JunkInjectedEvent({
        functionId: sfi.id,
        injectedCount: injectedForFunction,
      }));
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Injected ${mutationsApplied} dead/noop bytecode instructions.`,
      events,
    };
  }
}
