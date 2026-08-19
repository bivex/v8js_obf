import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { RawConstantEntry } from "../model/constant-pool.ts";
import { DomainEvent, JunkInjectedEvent } from "../events/domain-events.ts";

export interface ConstantScramblerOptions extends MutatorOptions {
  dummyConstantsPerFunction?: number;
}

export class ConstantScramblerMutator extends BaseMutator {
  constructor() {
    super(
      "ConstantScramblerMutator",
      "Injects honeypot and dead constant entries into constant pools to hinder static analysis and decompilation"
    );
  }

  public mutate(codeCache: CodeCache, options?: ConstantScramblerOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;
    const count = options?.dummyConstantsPerFunction ?? 2;

    for (const sfi of codeCache.getAllFunctions()) {
      for (let k = 0; k < count; k++) {
        const dummyKey = `__v8_trap_0x${Math.floor(Math.random() * 0xffff).toString(16)}`;
        sfi.constantPool.add(new RawConstantEntry(0, `<HoneypotConstant: ${dummyKey}>`));
        mutationsApplied++;
      }
      events.push(new JunkInjectedEvent({
        functionId: sfi.id,
        injectedCount: count,
      }));
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Injected ${mutationsApplied} dummy/honeypot constants into function constant pools.`,
      events,
    };
  }
}
