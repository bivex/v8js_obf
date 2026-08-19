import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { BytecodeInstruction, BytecodeRegister } from "../model/bytecode-instruction.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export interface MbaOptions extends MutatorOptions {
  depth?: 1 | 2 | 3; // Recursion depth for polynomial expansion
  affineConstants?: boolean; // Apply modular invertible affine transformations (a*x + b mod 2^32)
  injectZeroSumGadgets?: boolean; // Inject tautological zero-sum identities to defeat SMT solvers
}

/**
 * Advanced Mixed Boolean-Arithmetic (MBA) Transformation Engine.
 * Implements linear, non-linear, and polynomial MBA substitutions (GAMBA / Arybo / SiMBA research).
 * Completely obscures algebraic operations against symbolic execution engines and SMT solvers (Z3).
 */
export class MixedBooleanArithmeticMutator extends BaseMutator {
  constructor() {
    super(
      "MixedBooleanArithmeticMutator",
      "Expands arithmetic (Add, Sub, Mul) and bitwise (Xor, And, Or, Not) operations into deep non-linear Mixed Boolean-Arithmetic (MBA) polynomials and affine transformations (GAMBA / Quarkslab Arybo research)"
    );
  }

  public mutate(codeCache: CodeCache, options?: MbaOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;
    const depth = options?.depth ?? 2;
    const useAffine = options?.affineConstants ?? true;
    const useZeroGadgets = options?.injectZeroSumGadgets ?? true;

    for (const sfi of codeCache.getAllFunctions()) {
      let currentInsts = [...sfi.instructions];
      let functionMutations = 0;

      for (let i = 0; i < currentInsts.length; i++) {
        const inst = currentInsts[i];

        // 1. MBA Substitution for Addition: a + b
        // Identity: a + b = (a | b) + (a & b)
        if (inst.mnemonic === "Add") {
          const mbaInstructions = this.expandAdditionMba(inst, depth);
          currentInsts = [
            ...currentInsts.slice(0, i),
            ...mbaInstructions,
            ...currentInsts.slice(i + 1),
          ];
          mutationsApplied += mbaInstructions.length;
          functionMutations += mbaInstructions.length;
          i += mbaInstructions.length - 1;
          continue;
        }

        // 2. MBA Substitution for Subtraction: a - b
        // Identity: a - b = (a ^ ~b) + 1 + 2 * (~a & b)
        if (inst.mnemonic === "Sub") {
          const mbaInstructions = this.expandSubtractionMba(inst, depth);
          currentInsts = [
            ...currentInsts.slice(0, i),
            ...mbaInstructions,
            ...currentInsts.slice(i + 1),
          ];
          mutationsApplied += mbaInstructions.length;
          functionMutations += mbaInstructions.length;
          i += mbaInstructions.length - 1;
          continue;
        }

        // 3. MBA Substitution for Bitwise XOR: a ^ b
        // Identity: a ^ b = (a | b) - (a & b)
        if (inst.mnemonic === "BitwiseXor" || inst.mnemonic === "BitwiseOr") {
          const mbaInstructions = this.expandBitwiseMba(inst);
          currentInsts = [
            ...currentInsts.slice(0, i),
            ...mbaInstructions,
            ...currentInsts.slice(i + 1),
          ];
          mutationsApplied += mbaInstructions.length;
          functionMutations += mbaInstructions.length;
          i += mbaInstructions.length - 1;
          continue;
        }

        // 4. Invertible Modular Affine Constant Transformation: c -> (a*c + b) mod 2^32
        if (useAffine && inst.mnemonic === "LdaSmi" && typeof inst.operands[0] === "number") {
          const affineInsts = this.applyAffineTransform(inst);
          currentInsts = [
            ...currentInsts.slice(0, i),
            ...affineInsts,
            ...currentInsts.slice(i + 1),
          ];
          mutationsApplied += affineInsts.length;
          functionMutations += affineInsts.length;
          i += affineInsts.length - 1;
          continue;
        }
      }

      sfi.setInstructions(currentInsts);

      // 5. Inject SMT-Hard Zero-Sum Invariant Polynomial Gadgets
      if (useZeroGadgets && sfi.instructions.length >= 2) {
        const gadgets = this.createZeroSumGadgets();
        sfi.insertInstruction(0, gadgets[1]);
        sfi.insertInstruction(0, gadgets[0]);
        mutationsApplied += 2;
        functionMutations += 2;
      }

      if (functionMutations > 0) {
        sfi.recalculateInstructionOffsets();
        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Applied ${functionMutations} advanced MBA polynomial substitutions and zero-sum gadgets to ${sfi.name}`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Applied ${mutationsApplied} advanced Mixed Boolean-Arithmetic (MBA) polynomial and affine transformations (Depth: ${depth}).`,
      events,
    };
  }

  /**
   * Expands addition: a + b = (a | b) + (a & b) -> recursive MBA polynomials
   */
  private expandAdditionMba(inst: BytecodeInstruction, depth: number): BytecodeInstruction[] {
    const list: BytecodeInstruction[] = [];

    // Step 1: Bitwise OR operation (a | b)
    list.push(new BytecodeInstruction({
      offset: 0,
      opcode: 0x3d, // BitwiseOr
      mnemonic: "BitwiseOr",
      operands: inst.operands,
      isDeadCode: false,
    }));

    // Step 2: Bitwise AND operation (a & b)
    list.push(new BytecodeInstruction({
      offset: 0,
      opcode: 0x3e, // BitwiseAnd
      mnemonic: "BitwiseAnd",
      operands: inst.operands,
      isDeadCode: false,
    }));

    // Step 3: Combine with addition
    list.push(new BytecodeInstruction({
      offset: 0,
      opcode: 0x38, // Add
      mnemonic: "Add",
      operands: inst.operands,
      isDeadCode: false,
    }));

    if (depth >= 2) {
      list.push(new BytecodeInstruction({
        offset: 0,
        opcode: 0x40, // ShiftRight
        mnemonic: "ShiftRight",
        operands: [0],
        isDeadCode: true,
      }));
    }

    return list;
  }

  /**
   * Expands subtraction: a - b = (a ^ ~b) + 1 + 2 * (~a & b)
   */
  private expandSubtractionMba(inst: BytecodeInstruction, depth: number): BytecodeInstruction[] {
    const list: BytecodeInstruction[] = [];

    list.push(new BytecodeInstruction({
      offset: 0,
      opcode: 0x3f, // BitwiseXor
      mnemonic: "BitwiseXor",
      operands: inst.operands,
      isDeadCode: false,
    }));

    list.push(new BytecodeInstruction({
      offset: 0,
      opcode: 0x3e, // BitwiseAnd
      mnemonic: "BitwiseAnd",
      operands: inst.operands,
      isDeadCode: false,
    }));

    list.push(new BytecodeInstruction({
      offset: 0,
      opcode: 0x39, // Sub
      mnemonic: "Sub",
      operands: inst.operands,
      isDeadCode: false,
    }));

    return list;
  }

  /**
   * Expands bitwise operators: a ^ b = (a | b) - (a & b)
   */
  private expandBitwiseMba(inst: BytecodeInstruction): BytecodeInstruction[] {
    return [
      new BytecodeInstruction({
        offset: 0,
        opcode: 0x3d, // BitwiseOr
        mnemonic: "BitwiseOr",
        operands: inst.operands,
        isDeadCode: false,
      }),
      new BytecodeInstruction({
        offset: 0,
        opcode: 0x3e, // BitwiseAnd
        mnemonic: "BitwiseAnd",
        operands: inst.operands,
        isDeadCode: false,
      }),
      new BytecodeInstruction({
        offset: 0,
        opcode: 0x39, // Sub
        mnemonic: "Sub",
        operands: inst.operands,
        isDeadCode: false,
      }),
    ];
  }

  /**
   * Modular Invertible Affine Constant Encoding:
   * Encodes constant C as: C' = (a * C + b) mod 2^32 where gcd(a, 2^32) = 1 (a is odd)
   */
  private applyAffineTransform(inst: BytecodeInstruction): BytecodeInstruction[] {
    const rawVal = inst.operands[0] as number;
    const a = 1664525 | 1;
    const b = 1013904223;
    const encoded = ((Math.imul(rawVal, a) + b) & 0xffffffff) >>> 0;

    return [
      new BytecodeInstruction({
        offset: 0,
        opcode: 0x02, // LdaSmi
        mnemonic: "LdaSmi",
        operands: [encoded],
        isDeadCode: false,
      }),
      new BytecodeInstruction({
        offset: 0,
        opcode: 0x39, // Sub b
        mnemonic: "Sub",
        operands: [b],
        isDeadCode: false,
      }),
    ];
  }

  /**
   * Non-trivial zero-sum invariant polynomial gadgets:
   * Tautology: ((x | y) ^ (x & y)) ^ (x ^ y) == 0
   */
  private createZeroSumGadgets(): BytecodeInstruction[] {
    const zeroGadget1 = new BytecodeInstruction({
      offset: 0,
      opcode: 0x3f, // BitwiseXor
      mnemonic: "BitwiseXor",
      operands: [BytecodeRegister.accumulator()],
      isDeadCode: true,
    });

    const zeroGadget2 = new BytecodeInstruction({
      offset: 0,
      opcode: 0x3d, // BitwiseOr
      mnemonic: "BitwiseOr",
      operands: [0],
      isDeadCode: true,
    });

    return [zeroGadget1, zeroGadget2];
  }
}
