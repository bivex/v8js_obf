import { describe, it, expect } from "bun:test";
import { CodeCache } from "../../src/domain/model/code-cache.ts";
import { SharedFunctionInfo } from "../../src/domain/model/shared-function-info.ts";
import { ConstantPool, StringConstantEntry } from "../../src/domain/model/constant-pool.ts";
import { HandlerTable } from "../../src/domain/model/handler-table.ts";
import { BytecodeInstruction } from "../../src/domain/model/bytecode-instruction.ts";
import { VirtScEngineMutator } from "../../src/domain/obfuscation/virtsc-engine.ts";

describe("Domain: VirtSC Virtualization & Self-Checksumming (arXiv:1909.11404)", () => {
  it("should lift functions to RISA and construct Network of Checkers DAG", () => {
    const cache = CodeCache.createEmpty();

    const f1 = new SharedFunctionInfo({
      id: "func_auth_0x1",
      name: "authCheck",
      parameterCount: 2,
      registerCount: 4,
      instructions: [
        new BytecodeInstruction({ offset: 0, opcode: 0x08, mnemonic: "LdaConstant", operands: [0] }),
        new BytecodeInstruction({ offset: 2, opcode: 0xa8, mnemonic: "Return", operands: [] }),
      ],
      constantPool: new ConstantPool([new StringConstantEntry(0, "SECRET")]),
      handlerTable: new HandlerTable(),
    });

    const f2 = new SharedFunctionInfo({
      id: "func_crypto_0x2",
      name: "cryptoHash",
      parameterCount: 1,
      registerCount: 2,
      instructions: [
        new BytecodeInstruction({ offset: 0, opcode: 0x08, mnemonic: "LdaConstant", operands: [0] }),
        new BytecodeInstruction({ offset: 2, opcode: 0xa8, mnemonic: "Return", operands: [] }),
      ],
      constantPool: new ConstantPool([new StringConstantEntry(0, "SALT")]),
      handlerTable: new HandlerTable(),
    });

    cache.addFunction(f1);
    cache.addFunction(f2);

    const virtSc = new VirtScEngineMutator();
    const result = virtSc.mutate(cache, { connectivity: 1 });

    expect(result.mutationsApplied).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);

    // Verify that VirtSC RISA descriptor was added to constant pool
    const consts = f1.constantPool.getAll();
    expect(consts.some(c => c.toDisplayString().includes("VirtSC_RISA_VPA"))).toBe(true);

    // Verify guards were injected
    expect(f1.instructions.length).toBeGreaterThan(2);
  });
});
