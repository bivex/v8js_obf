import { describe, it, expect } from "bun:test";
import { CodeCache } from "../../src/domain/model/code-cache.ts";
import { SharedFunctionInfo } from "../../src/domain/model/shared-function-info.ts";
import { ConstantPool, StringConstantEntry } from "../../src/domain/model/constant-pool.ts";
import { HandlerTable } from "../../src/domain/model/handler-table.ts";
import { BytecodeInstruction } from "../../src/domain/model/bytecode-instruction.ts";
import { StringEncryptorMutator } from "../../src/domain/obfuscation/string-encryptor-mutator.ts";
import { IdentifierManglerMutator } from "../../src/domain/obfuscation/identifier-mangler-mutator.ts";
import { ConstantScramblerMutator } from "../../src/domain/obfuscation/constant-scrambler-mutator.ts";
import { BytecodeJunkMutator } from "../../src/domain/obfuscation/bytecode-junk-mutator.ts";

describe("Domain: Obfuscation Mutators", () => {
  function createTestCache(): CodeCache {
    const cache = CodeCache.createEmpty();
    const pool = new ConstantPool([
      new StringConstantEntry(0, "password123"),
      new StringConstantEntry(1, "https://api.internal/v1"),
    ]);

    const sfi = new SharedFunctionInfo({
      id: "func_auth_0x10",
      name: "authenticateUser",
      parameterCount: 2,
      registerCount: 3,
      instructions: [
        new BytecodeInstruction({ offset: 0, opcode: 0x08, mnemonic: "LdaConstant", operands: [0] }),
        new BytecodeInstruction({ offset: 2, opcode: 0xa8, mnemonic: "Return", operands: [] }),
      ],
      constantPool: pool,
      handlerTable: new HandlerTable(),
    });

    cache.addFunction(sfi);
    return cache;
  }

  it("StringEncryptorMutator should encrypt strings and mask raw values", () => {
    const cache = createTestCache();
    const mutator = new StringEncryptorMutator();
    const result = mutator.mutate(cache, { key: 0x42 });

    expect(result.mutationsApplied).toBe(2);
    const sfi = cache.getAllFunctions()[0];
    const str0 = sfi.constantPool.get(0) as StringConstantEntry;
    expect(str0.isEncrypted).toBe(true);
    expect(str0.value).not.toBe("password123");
  });

  it("IdentifierManglerMutator should rename functions to randomized hashes", () => {
    const cache = createTestCache();
    const mutator = new IdentifierManglerMutator();
    const result = mutator.mutate(cache, { prefix: "_0x_v8_" });

    expect(result.mutationsApplied).toBe(1);
    const sfi = cache.getAllFunctions()[0];
    expect(sfi.name.startsWith("_0x_v8_")).toBe(true);
  });

  it("ConstantScramblerMutator should inject honeypots into constant pools", () => {
    const cache = createTestCache();
    const sfi = cache.getAllFunctions()[0];
    const initialSize = sfi.constantPool.size;

    const mutator = new ConstantScramblerMutator();
    mutator.mutate(cache, { dummyConstantsPerFunction: 3 });

    expect(sfi.constantPool.size).toBe(initialSize + 3);
  });

  it("BytecodeJunkMutator should inject dead bytecode instructions", () => {
    const cache = createTestCache();
    const sfi = cache.getAllFunctions()[0];
    const initialInsts = sfi.instructions.length;

    const mutator = new BytecodeJunkMutator();
    mutator.mutate(cache, { junkInstructionsPerFunction: 2 });

    expect(sfi.instructions.length).toBe(initialInsts + 2);
    expect(sfi.instructions.some(i => i.isDeadCode)).toBe(true);
  });
});
