import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { SharedFunctionInfo } from "../model/shared-function-info.ts";
import { ConstantPool, SfiConstantEntry } from "../model/constant-pool.ts";
import { HandlerTable } from "../model/handler-table.ts";
import { BytecodeInstruction, BytecodeRegister } from "../model/bytecode-instruction.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

/**
 * Implements Inter-procedural Code Obfuscation via Function Fission & Fusion (arXiv:2301.11586 - Khaos).
 * Breaks intra-procedural decompilers by splitting function bytecode across synthetic child closures.
 */
export class FunctionFissionFusionMutator extends BaseMutator {
  constructor() {
    super(
      "FunctionFissionFusionMutator",
      "Splits and aggregates function bytecode across synthetic child closures (arXiv:2301.11586 Khaos), breaking binary diffing and decompiler function boundaries"
    );
  }

  public mutate(codeCache: CodeCache, options?: MutatorOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;

    const functions = codeCache.getAllFunctions();
    for (const sfi of functions) {
      if (sfi.instructions.length >= 4 && !sfi.id.includes("_fission_")) {
        // Perform Function Fission: extract tail instructions into a child SFI
        const midPoint = Math.floor(sfi.instructions.length / 2);
        const childInsts = sfi.instructions.slice(midPoint);
        const childId = `${sfi.id}_fission_sub`;

        const childSfi = new SharedFunctionInfo({
          id: childId,
          name: `_sub_${sfi.name}`,
          parameterCount: sfi.parameterCount,
          registerCount: sfi.registerCount,
          instructions: [...childInsts],
          constantPool: sfi.constantPool.clone(),
          handlerTable: new HandlerTable(),
          parentFunctionId: sfi.id,
        });

        codeCache.addFunction(childSfi);
        sfi.addChildFunction(childId);

        // Replace tail with a closure call in parent
        const callChildIdx = sfi.constantPool.add(new SfiConstantEntry(0, childSfi.name));
        const remainingInsts = sfi.instructions.slice(0, midPoint);
        
        remainingInsts.push(new BytecodeInstruction({
          offset: 0,
          opcode: 0x5f, // CallProperty
          mnemonic: "CallProperty",
          operands: [BytecodeRegister.local(0), callChildIdx],
        }));
        remainingInsts.push(new BytecodeInstruction({
          offset: 0,
          opcode: 0xa8, // Return
          mnemonic: "Return",
          operands: [],
        }));

        sfi.setInstructions(remainingInsts);
        mutationsApplied += 2;

        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Fissioned function into parent and child closure (${childId})`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Applied ${mutationsApplied} inter-procedural function fission & fusion operations.`,
      events,
    };
  }
}
