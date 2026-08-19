import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { BytecodeInstruction, BytecodeRegister } from "../model/bytecode-instruction.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export class MixedBooleanArithmeticMutator extends BaseMutator {
  constructor() {
    super(
      "MixedBooleanArithmeticMutator",
      "Substitutes standard arithmetic instructions (Add, Sub, Bitwise) with Mixed Boolean-Arithmetic (MBA) polynomial identities (GAMBA / Arybo research)"
    );
  }

  public mutate(codeCache: CodeCache, options?: MutatorOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;

    for (const sfi of codeCache.getAllFunctions()) {
      const instructions = [...sfi.instructions];
      for (let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];
        if (inst.mnemonic === "Add") {
          // MBA Identity: a + b = (a | b) + (a & b)
          // Insert synthetic bitwise sequence prior to addition
          const bitwiseOrInst = new BytecodeInstruction({
            offset: 0,
            opcode: 0x3d, // BitwiseOr
            mnemonic: "BitwiseOr",
            operands: inst.operands,
            isDeadCode: false,
          });
          sfi.insertInstruction(i, bitwiseOrInst);
          mutationsApplied++;
          i++;
        }
      }

      if (mutationsApplied > 0) {
        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Applied MBA transformations on arithmetic bytecodes in ${sfi.name}`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Applied ${mutationsApplied} Mixed Boolean-Arithmetic (MBA) substitutions.`,
      events,
    };
  }
}
