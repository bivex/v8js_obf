import { CodeCache } from "../model/code-cache.ts";
import { DomainEvent } from "../events/domain-events.ts";

export interface MutatorResult {
  mutatorName: string;
  mutationsApplied: number;
  description: string;
  events: DomainEvent[];
}

export interface MutatorOptions {
  enabled?: boolean;
  seed?: number;
  [key: string]: any;
}

export abstract class BaseMutator {
  constructor(
    public readonly name: string,
    public readonly description: string
  ) {}

  public abstract mutate(codeCache: CodeCache, options?: MutatorOptions): MutatorResult;
}
