import { describe, it, expect } from "bun:test";
import {
  ConstantPool,
  StringConstantEntry,
  NumberConstantEntry,
  SfiConstantEntry,
} from "../../src/domain/model/constant-pool.ts";

describe("Domain: ConstantPool", () => {
  it("should store and retrieve polymorphic constant entries", () => {
    const pool = new ConstantPool();
    pool.add(new StringConstantEntry(0, "SECRET_TOKEN"));
    pool.add(new NumberConstantEntry(1, 42));
    pool.add(new SfiConstantEntry(2, "calculateHash"));

    expect(pool.size).toBe(3);
    expect(pool.getStrings().length).toBe(1);
    expect(pool.getStrings()[0].value).toBe("SECRET_TOKEN");
  });

  it("should support updating and cloning constant pools", () => {
    const pool = new ConstantPool();
    const str = new StringConstantEntry(0, "apiKey");
    pool.add(str);

    pool.replace(0, (prev) => {
      if (prev instanceof StringConstantEntry) {
        return prev.withEncryptedValue("ZW5jcnlwdGVk", 0x42);
      }
      return prev;
    });

    const updated = pool.get(0) as StringConstantEntry;
    expect(updated.isEncrypted).toBe(true);
    expect(updated.value).toBe("ZW5jcnlwdGVk");
  });
});
