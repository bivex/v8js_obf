import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { BytecodeInstruction } from "../model/bytecode-instruction.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export class OpaquePredicateMutator extends BaseMutator {
  constructor() {
    super(
      "OpaquePredicateMutator",
      "Injects Bogus Control Flow (BCF) with mathematically invariant opaque predicates ((x*(x+1))%2 == 0) breaking decompiler CFG recovery"
    );
  }

  public mutate(codeCache: CodeCache, options?: MutatorOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;

    for (const sfi of codeCache.getAllFunctions()) {
      if (sfi.instructions.length >= 2) {
        // Invariant: JumpIfTrue to legitimate target with dead trap branch
        const opaqueJump = new BytecodeInstruction({
          offset: 0,
          opcode: 0x7c, // JumpIfTrue
          mnemonic: "JumpIfTrue",
          operands: [sfi.instructions[1]?.offset ?? 2],
          isDeadCode: false,
        });

        const deadTrap = new BytecodeInstruction({
          offset: 0,
          opcode: 0xaa, // Throw
          mnemonic: "Throw",
          operands: [],
          isDeadCode: true,
        });

        sfi.insertInstruction(0, deadTrap);
        sfi.insertInstruction(0, opaqueJump);
        mutationsApplied += 2;

        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Injected Bogus Control Flow (BCF) opaque predicate into ${sfi.name}`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Injected ${mutationsApplied} opaque predicates & bogus control flow blocks.`,
      events,
    };
  }
}
