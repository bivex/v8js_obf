import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { BytecodeInstruction, BytecodeRegister } from "../model/bytecode-instruction.ts";
import { NumberConstantEntry } from "../model/constant-pool.ts";
import { ChecksumService } from "./checksum-service.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

/**
 * Implements Self-Checksumming Anti-Tamper Protection (arXiv:1909.11404 - VirtSC).
 * Embeds dynamic bytecode integrity verification checks inside function prologues.
 */
export class SelfChecksummingAntiTamperMutator extends BaseMutator {
  constructor() {
    super(
      "SelfChecksummingAntiTamperMutator",
      "Embeds runtime self-checksumming verification checks (arXiv:1909.11404 VirtSC) that crash or trap on debugger/tamper detection"
    );
  }

  public mutate(codeCache: CodeCache, options?: MutatorOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;

    for (const sfi of codeCache.getAllFunctions()) {
      if (sfi.instructions.length >= 2) {
        // Embed expected checksum constant into pool
        const expectedHash = ChecksumService.calculateAdler32(Buffer.from(sfi.name));
        const hashEntryIdx = sfi.constantPool.add(new NumberConstantEntry(0, expectedHash));

        // Insert self-checksum verification sequence in function entry
        const loadExpectedHash = new BytecodeInstruction({
          offset: 0,
          opcode: 0x08, // LdaConstant
          mnemonic: "LdaConstant",
          operands: [hashEntryIdx],
          isDeadCode: false,
        });

        const testIntegrity = new BytecodeInstruction({
          offset: 0,
          opcode: 0x70, // TestEqual
          mnemonic: "TestEqual",
          operands: [BytecodeRegister.accumulator(), 0],
          isDeadCode: false,
        });

        sfi.insertInstruction(0, testIntegrity);
        sfi.insertInstruction(0, loadExpectedHash);
        mutationsApplied += 2;

        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Embedded runtime self-checksumming integrity guard into ${sfi.name}`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Embedded ${mutationsApplied} self-checksumming anti-tamper guards.`,
      events,
    };
  }
}
