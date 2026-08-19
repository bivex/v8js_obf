import { describe, it, expect } from "bun:test";
import { CodeCacheHeader } from "../../src/domain/model/code-cache-header.ts";

describe("Domain: CodeCacheHeader", () => {
  it("should create header with default magic number and properties", () => {
    const header = CodeCacheHeader.create({
      magicNumber: 0xC0DE0628,
      versionHash: 0x79dafe74,
      sourceHash: 42,
      flagHash: 0x2e9565a3,
      payloadLength: 512,
      checksum: 0x1e0,
    });

    expect(header.magicNumber).toBe(0xC0DE0628);
    expect(header.versionHash).toBe(0x79dafe74);
    expect(header.payloadLength).toBe(512);
  });

  it("should serialize to buffer and deserialize back correctly (roundtrip)", () => {
    const original = CodeCacheHeader.create({
      magicNumber: 0xC0DE0628,
      versionHash: 0x12345678,
      sourceHash: 100,
      flagHash: 0x87654321,
      payloadLength: 1024,
      checksum: 0xbeef,
    });

    const buf = original.toBuffer();
    expect(buf.length).toBe(32);

    const parsed = CodeCacheHeader.fromBuffer(buf);
    expect(parsed.magicNumber).toBe(original.magicNumber);
    expect(parsed.versionHash).toBe(original.versionHash);
    expect(parsed.sourceHash).toBe(original.sourceHash);
    expect(parsed.flagHash).toBe(original.flagHash);
    expect(parsed.payloadLength).toBe(original.payloadLength);
    expect(parsed.checksum).toBe(original.checksum);
  });
});
