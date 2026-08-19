/**
 * Value Object representing the Exception Handler Table in V8 Bytecode.
 * Maps ranges [fromOffset, toOffset] to the catch/finally handler PC offset.
 */
export interface ExceptionRange {
  fromOffset: number;
  toOffset: number;
  handlerOffset: number;
  contextSlot?: number;
}

export class HandlerTable {
  constructor(private readonly ranges: ExceptionRange[] = []) {}

  public getEntries(): ReadonlyArray<ExceptionRange> {
    return this.ranges;
  }

  public addRange(fromOffset: number, toOffset: number, handlerOffset: number, contextSlot?: number): HandlerTable {
    const next = [...this.ranges, { fromOffset, toOffset, handlerOffset, contextSlot }];
    return new HandlerTable(next);
  }

  public adjustOffsets(deltaOffset: number, startFrom: number = 0): HandlerTable {
    const updated = this.ranges.map(range => ({
      fromOffset: range.fromOffset >= startFrom ? range.fromOffset + deltaOffset : range.fromOffset,
      toOffset: range.toOffset >= startFrom ? range.toOffset + deltaOffset : range.toOffset,
      handlerOffset: range.handlerOffset >= startFrom ? range.handlerOffset + deltaOffset : range.handlerOffset,
      contextSlot: range.contextSlot,
    }));
    return new HandlerTable(updated);
  }

  public toJSON() {
    return this.ranges.map(r => `[${r.fromOffset}, ${r.toOffset}) -> handler @ ${r.handlerOffset}`);
  }
}
