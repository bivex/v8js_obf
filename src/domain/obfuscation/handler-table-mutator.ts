import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export class HandlerTableAntiDisassemblyMutator extends BaseMutator {
  constructor() {
    super(
      "HandlerTableAntiDisassemblyMutator",
      "Injects synthetic exception handler table ranges to trigger parsing exceptions in Ghidra and View8 decompiler CFGs"
    );
  }

  public mutate(codeCache: CodeCache, options?: MutatorOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;

    for (const sfi of codeCache.getAllFunctions()) {
      if (sfi.instructions.length > 0) {
        const lastOffset = sfi.instructions[sfi.instructions.length - 1].offset;
        (sfi as any).props.handlerTable = sfi.handlerTable.addRange(0, lastOffset + 2, lastOffset);
        mutationsApplied++;

        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Injected synthetic HandlerTable range into ${sfi.name}`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Injected ${mutationsApplied} synthetic exception handler tables for anti-disassembly.`,
      events,
    };
  }
}
