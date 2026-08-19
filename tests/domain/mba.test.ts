import { describe, it, expect } from "bun:test";
import { CodeCache } from "../../src/domain/model/code-cache.ts";
import { SharedFunctionInfo } from "../../src/domain/model/shared-function-info.ts";
import { ConstantPool } from "../../src/domain/model/constant-pool.ts";
import { HandlerTable } from "../../src/domain/model/handler-table.ts";
import { BytecodeInstruction, BytecodeRegister } from "../../src/domain/model/bytecode-instruction.ts";
import { MixedBooleanArithmeticMutator } from "../../src/domain/obfuscation/mba-mutator.ts";

describe("Domain: Advanced Mixed Boolean-Arithmetic (MBA) Engine", () => {
  it("should expand addition into non-linear MBA polynomials (a + b = (a|b) + (a&b))", () => {
    const cache = CodeCache.createEmpty();
    const sfi = new SharedFunctionInfo({
      id: "func_calc_0x1",
      name: "calculateMath",
      parameterCount: 2,
      registerCount: 4,
      instructions: [
        new BytecodeInstruction({ offset: 0, opcode: 0x0b, mnemonic: "Ldar", operands: [BytecodeRegister.arg(0)] }),
        new BytecodeInstruction({ offset: 2, opcode: 0x38, mnemonic: "Add", operands: [BytecodeRegister.arg(1), 0] }),
        new BytecodeInstruction({ offset: 4, opcode: 0xa8, mnemonic: "Return", operands: [] }),
      ],
      constantPool: new ConstantPool(),
      handlerTable: new HandlerTable(),
    });

    cache.addFunction(sfi);

    const mba = new MixedBooleanArithmeticMutator();
    const result = mba.mutate(cache, { depth: 2, affineConstants: true, injectZeroSumGadgets: true });

    expect(result.mutationsApplied).toBeGreaterThan(0);
    expect(sfi.instructions.length).toBeGreaterThan(3);

    // Verify presence of Bitwise MBA opcodes
    const mnemonics = sfi.instructions.map(i => i.mnemonic);
    expect(mnemonics.includes("BitwiseOr") || mnemonics.includes("BitwiseAnd")).toBe(true);
  });

  it("should apply modular affine constant transformation on numeric immediates", () => {
    const cache = CodeCache.createEmpty();
    const sfi = new SharedFunctionInfo({
      id: "func_const_0x2",
      name: "loadConstants",
      parameterCount: 1,
      registerCount: 2,
      instructions: [
        new BytecodeInstruction({ offset: 0, opcode: 0x02, mnemonic: "LdaSmi", operands: [100] }),
        new BytecodeInstruction({ offset: 2, opcode: 0xa8, mnemonic: "Return", operands: [] }),
      ],
      constantPool: new ConstantPool(),
      handlerTable: new HandlerTable(),
    });

    cache.addFunction(sfi);

    const mba = new MixedBooleanArithmeticMutator();
    mba.mutate(cache, { depth: 1, affineConstants: true, injectZeroSumGadgets: false });

    // The raw 100 immediate should be transformed into affine-encoded value
    const ldaSmi = sfi.instructions.find(i => i.mnemonic === "LdaSmi");
    expect(ldaSmi).toBeDefined();
    expect(ldaSmi?.operands[0]).not.toBe(100);
  });
});
