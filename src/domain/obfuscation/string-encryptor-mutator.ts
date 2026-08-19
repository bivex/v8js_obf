import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { StringConstantEntry } from "../model/constant-pool.ts";
import { DomainEvent, StringEncryptedEvent } from "../events/domain-events.ts";

export interface StringEncryptorOptions extends MutatorOptions {
  encryptionMode?: "xor" | "base64_rot13" | "rc4_sub";
  key?: number;
}

export class StringEncryptorMutator extends BaseMutator {
  constructor() {
    super(
      "StringEncryptorMutator",
      "Encrypts and XOR-masks string constants in the constant pool, preventing plain-text string inspection"
    );
  }

  public mutate(codeCache: CodeCache, options?: StringEncryptorOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;
    const xorKey = options?.key ?? 0x5a;

    for (const sfi of codeCache.getAllFunctions()) {
      const pool = sfi.constantPool;
      for (let i = 0; i < pool.size; i++) {
        const entry = pool.get(i);
        if (entry instanceof StringConstantEntry && !entry.isEncrypted) {
          const original = entry.value;
          // Apply XOR encryption to string chars
          const encryptedChars = Array.from(original).map(c => 
            String.fromCharCode(c.charCodeAt(0) ^ xorKey)
          ).join("");

          const encoded = Buffer.from(encryptedChars, "binary").toString("base64");
          const updated = entry.withEncryptedValue(encoded, xorKey);
          pool.set(i, updated);

          mutationsApplied++;
          events.push(new StringEncryptedEvent({
            functionId: sfi.id,
            originalString: original,
            encryptedString: encoded,
            key: xorKey,
          }));
        }
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Encrypted ${mutationsApplied} string constants across ${codeCache.getFunctionCount()} functions.`,
      events,
    };
  }
}
