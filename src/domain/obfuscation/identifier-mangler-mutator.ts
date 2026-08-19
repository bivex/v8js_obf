import { BaseMutator, MutatorOptions, MutatorResult } from "./base-mutator.ts";
import { CodeCache } from "../model/code-cache.ts";
import { DomainEvent, FunctionMutatedEvent } from "../events/domain-events.ts";

export interface IdentifierManglerOptions extends MutatorOptions {
  prefix?: string;
  useHexadecimal?: boolean;
}

export class IdentifierManglerMutator extends BaseMutator {
  constructor() {
    super(
      "IdentifierManglerMutator",
      "Scrambles function names, internal SFI identifiers and symbol labels into obfuscated hex/random identifiers"
    );
  }

  public mutate(codeCache: CodeCache, options?: IdentifierManglerOptions): MutatorResult {
    const events: DomainEvent[] = [];
    let mutationsApplied = 0;
    const prefix = options?.prefix ?? "_0x";
    let counter = 0x1000;

    for (const sfi of codeCache.getAllFunctions()) {
      if (sfi.name !== "start" && sfi.name !== "(anonymous)") {
        const oldName = sfi.name;
        const mangledName = `${prefix}${(counter++).toString(16)}`;
        sfi.setName(mangledName);
        mutationsApplied++;

        events.push(new FunctionMutatedEvent({
          functionId: sfi.id,
          mutatorName: this.name,
          details: `Renamed '${oldName}' to '${mangledName}'`,
        }));
      }
    }

    return {
      mutatorName: this.name,
      mutationsApplied,
      description: `Mangled ${mutationsApplied} function identifiers.`,
      events,
    };
  }
}
