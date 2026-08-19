import { describe, it, expect } from "bun:test";
import { ObfuscationPipeline } from "../../src/domain/obfuscation/obfuscation-pipeline.ts";
import { V8BinaryParser } from "../../src/adapters/outbound/binary/v8-binary-parser.ts";

describe("UseCases: Obfuscation Pipeline", () => {
  const sample = `
Start SharedFunctionInfo
[SharedFunctionInfo] in [BytecodeArray] securePayment: [0x55aa]
Parameter count 3
Register count 4
Constant pool (size = 3)
  0: <String[16]: #card_cvv_secret >
  1: <String[12]: #bearer_token >
  2: 999
Handler Table (size = 0)
Bytecode:
  @    0 : 08 00       LdaConstant [0]
  @    2 : a8          Return 
End SharedFunctionInfo
`;

  it("should execute full multi-pass aggressive obfuscation pipeline", () => {
    const parser = new V8BinaryParser();
    const cache = parser.parseDisassemblyText(sample);
    const pipeline = ObfuscationPipeline.createAggressive();

    const report = pipeline.execute(cache);
    expect(report.totalMutationsApplied).toBeGreaterThan(0);
    expect(report.newChecksum).not.toBe(0);

    const sfi = cache.getAllFunctions()[0];
    expect(sfi.name.startsWith("_0x")).toBe(true);
    expect(sfi.instructions.length).toBeGreaterThan(2); // Junk + Control flow injected
  });
});
