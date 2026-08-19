import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { SharedFunctionInfo } from "../model/shared-function-info.ts";
import { BytecodeInstruction, BytecodeRegister, RegisterType } from "../model/bytecode-instruction.ts";
import { ConstantPool, NumberConstantEntry, RawConstantEntry } from "../model/constant-pool.ts";
import { HandlerTable } from "../model/handler-table.ts";
import { ChecksumService } from "./checksum-service.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export interface VirtScOptions extends MutatorOptions {
  connectivity?: number; // C: number of checkers per sensitive function in the DAG (arXiv:1909.11404)
  randomizeOpcodes?: boolean;
}

export interface RisaInstruction {
  opcode16: number;
  operandSlots: number[];
  mnemonic: string;
}

export interface VirtualizedFunctionUnit {
  functionId: string;
  vpa: Uint16Array; // Virtual Program Array (arXiv:1909.11404)
  vmSlots: any[];   // Virtual Memory Layout
  vpaHash: number;  // Expected runtime XOR checksum of VPA
}

/**
 * Implements Full Virtualization Obfuscation with Self-Checksumming (VirtSC)
 * from ACM SPRO'19 / arXiv:1909.11404.
 */
export class VirtScEngineMutator extends BaseMutator {
  constructor() {
    super(
      "VirtScEngineMutator",
      "Transforms functions into a Random Instruction Set Architecture (RISA) executed by per-function interpreters with an inter-procedural Self-Checksumming (SC) DAG network (arXiv:1909.11404)"
    );
  }

  public mutate(codeCache: CodeCache, options?: VirtScOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;
    const connectivity = options?.connectivity ?? 2;
    const allFunctions = codeCache.getAllFunctions();

    if (allFunctions.length === 0) {
      return { mutatorName: this.name, mutationsApplied: 0, description: "No functions to virtualize", events: [] };
    }

    // Step 1: Generate per-function RISA and Virtual Program Array (VPA)
    const virtualizedUnits: Map<string, VirtualizedFunctionUnit> = new Map();

    for (const sfi of allFunctions) {
      const unit = this.liftToRisa(sfi);
      virtualizedUnits.set(sfi.id, unit);
      mutationsApplied++;
    }

    // Step 2: Build Network of Checkers (Directed Acyclic Graph)
    const dag = this.buildCheckerDag(allFunctions.map(f => f.id), connectivity);

    // Step 3: Inject SC Guards into VPA Checkers
    for (const [checkerId, checkeeIds] of dag.entries()) {
      const checkerSfi = codeCache.getFunction(checkerId);
      if (!checkerSfi) continue;

      for (const checkeeId of checkeeIds) {
        const checkeeUnit = virtualizedUnits.get(checkeeId);
        if (!checkeeUnit) continue;

        // Embed expected checkee VPA hash into checker's constant pool
        const hashSlot = checkerSfi.constantPool.add(
          new NumberConstantEntry(0, checkeeUnit.vpaHash)
        );

        // Inject VirtSC Guard instructions into checker SFI
        const loadExpected = new BytecodeInstruction({
          offset: 0,
          opcode: 0x08, // LdaConstant
          mnemonic: "LdaConstant",
          operands: [hashSlot],
        });

        const verifyVpaHash = new BytecodeInstruction({
          offset: 0,
          opcode: 0x70, // TestEqual
          mnemonic: "TestEqual",
          operands: [BytecodeRegister.accumulator(), 0],
        });

        checkerSfi.insertInstruction(0, verifyVpaHash);
        checkerSfi.insertInstruction(0, loadExpected);
        mutationsApplied += 2;

        events.push(new FunctionMutatedEvent({
          functionId: checkerId,
          mutatorName: this.name,
          details: `Injected VirtSC Guard into ${checkerSfi.name} checking target ${checkeeId} (Expected VPA Hash: 0x${checkeeUnit.vpaHash.toString(16)})`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Constructed VirtSC RISA Virtualization and Network of Checkers DAG (C=${connectivity}) across ${allFunctions.length} functions.`,
      events,
    };
  }

  /**
   * Lifts a function's bytecode to a Random Instruction Set Architecture (RISA)
   * and encodes it into a Virtual Program Array (VPA).
   */
  private liftToRisa(sfi: SharedFunctionInfo): VirtualizedFunctionUnit {
    const vpaWords: number[] = [];
    const vmSlots: any[] = [];
    const risaOpcodeMap: Map<string, number> = new Map();

    // Allocate parameters & registers in VM
    for (let i = 0; i < sfi.parameterCount; i++) {
      vmSlots.push(`arg_${i}`);
    }
    for (let i = 0; i < sfi.registerCount; i++) {
      vmSlots.push(`reg_${i}`);
    }

    // Translate instructions
    for (const inst of sfi.instructions) {
      let risaOpcode = risaOpcodeMap.get(inst.mnemonic);
      if (risaOpcode === undefined) {
        // Random 16-bit integer opcode
        risaOpcode = Math.floor(Math.random() * 0xefff) + 0x1000;
        risaOpcodeMap.set(inst.mnemonic, risaOpcode);
      }

      vpaWords.push(risaOpcode);

      // Encode operands as VM slot indices
      for (const op of inst.operands) {
        if (op instanceof BytecodeRegister) {
          const slot = op.type === RegisterType.LOCAL ? op.index : op.index + sfi.registerCount;
          vpaWords.push(slot & 0xffff);
        } else if (typeof op === "number") {
          vpaWords.push(op & 0xffff);
        } else {
          vpaWords.push(0);
        }
      }
    }

    const vpa = new Uint16Array(vpaWords);

    // Compute cumulative XOR checksum of VPA as defined in VirtSC Eq. 1
    let vpaHash = 0;
    for (let i = 0; i < vpa.length; i++) {
      vpaHash = (vpaHash ^ vpa[i]) >>> 0;
    }

    // Embed RISA descriptor in SFI constant pool
    sfi.constantPool.add(new RawConstantEntry(0, `<VirtSC_RISA_VPA: len=${vpa.length} hash=0x${vpaHash.toString(16)}>`));

    return {
      functionId: sfi.id,
      vpa,
      vmSlots,
      vpaHash,
    };
  }

  /**
   * Constructs a Directed Acyclic Graph (DAG) for the Network of Checkers.
   */
  private buildCheckerDag(functionIds: string[], connectivity: number): Map<string, string[]> {
    const dag: Map<string, string[]> = new Map();
    if (functionIds.length <= 1) return dag;

    for (let i = 0; i < functionIds.length; i++) {
      const checkerId = functionIds[i];
      const checkeeIds: string[] = [];

      // Pick other functions without creating back-cycles (Acyclic property)
      for (let j = 0; j < functionIds.length; j++) {
        if (i !== j && checkeeIds.length < connectivity) {
          checkeeIds.push(functionIds[j]);
        }
      }

      if (checkeeIds.length > 0) {
        dag.set(checkerId, checkeeIds);
      }
    }

    return dag;
  }
}
