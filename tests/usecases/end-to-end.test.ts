import { describe, it, expect } from "bun:test";
import { V8ObfuscatorApi } from "../../src/adapters/inbound/api/obfuscator-api.ts";

describe("End-to-End: V8 Obfuscator API", () => {
  it("should compile JS code to V8 code cache, obfuscate, and verify execution", async () => {
    const api = V8ObfuscatorApi.create();
    const jsSource = "function add(a, b) { return a + b; } add(5, 7);";

    // 1. Compile source to V8 code cache
    const { codeCache, rawBuffer } = await api.compileUseCase.compile(jsSource);
    expect(rawBuffer.length).toBeGreaterThan(32);
    expect(codeCache.getHeader().magicNumber).toBe(0xC0DE0628);

    // 2. Analyze code cache
    const analysisBefore = api.analyzeUseCase.analyze(codeCache);
    expect(analysisBefore.payloadSize).toBeGreaterThan(0);

    // 3. Obfuscate
    const { obfuscatedCache, report } = await api.obfuscateUseCase.obfuscate(codeCache, {
      profile: "aggressive",
    });
    expect(report.totalMutationsApplied).toBeGreaterThan(0);

    // 4. Verify that the obfuscated code cache serializes with valid checksum
    const obfuscatedBuf = await api.serializeUseCase.serializeToBuffer(obfuscatedCache);
    expect(obfuscatedBuf.length).toBeGreaterThan(32);

    // 5. Check analysis score after obfuscation
    const analysisAfter = api.analyzeUseCase.analyze(obfuscatedCache);
    expect(analysisAfter.securityScore).toBeGreaterThanOrEqual(analysisBefore.securityScore);
  });
});
