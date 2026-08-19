import { describe, it, expect } from "bun:test";
import { V8BinaryParser } from "../../src/adapters/outbound/binary/v8-binary-parser.ts";
import { V8BinarySerializer } from "../../src/adapters/outbound/binary/v8-binary-serializer.ts";

describe("Adapters: V8 Binary Codec & Disassembler", () => {
  const sampleDisasm = `
Start SharedFunctionInfo
[SharedFunctionInfo] in [BytecodeArray] calculateTotal: [0x7f001]
Parameter count 2
Register count 3
Constant pool (size = 2)
  0: <String[5]: #price >
  1: <String[3]: #tax >
Handler Table (size = 0)
Bytecode:
  @    0 : 08 00       LdaConstant [0]
  @    2 : a8          Return 
End SharedFunctionInfo
`;

  it("should parse disassembly text into CodeCache domain aggregate", () => {
    const parser = new V8BinaryParser();
    const cache = parser.parseDisassemblyText(sampleDisasm);

    expect(cache.getFunctionCount()).toBe(1);
    const sfi = cache.getAllFunctions()[0];
    expect(sfi.name).toBe("calculateTotal");
    expect(sfi.constantPool.size).toBe(2);
    expect(sfi.instructions.length).toBe(2);
  });

  it("should roundtrip CodeCache between disassembly parser and serializer", () => {
    const parser = new V8BinaryParser();
    const serializer = new V8BinarySerializer();

    const cache = parser.parseDisassemblyText(sampleDisasm);
    const disasmOutput = serializer.toDisassemblyText(cache);

    expect(disasmOutput).toContain("calculateTotal");
    expect(disasmOutput).toContain("LdaConstant [0]");
    expect(disasmOutput).toContain("Return");
  });
});
