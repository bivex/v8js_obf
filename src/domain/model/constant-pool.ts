/**
 * Entities representing the V8 Constant Pool.
 * Contains strings, numbers, object/array boilerplates, inner functions, oddballs, and scopes.
 */

export enum ConstantType {
  STRING = "String",
  NUMBER = "Number",
  BIGINT = "BigInt",
  SHARED_FUNCTION_INFO = "SharedFunctionInfo",
  ARRAY_BOILERPLATE = "ArrayBoilerplate",
  OBJECT_BOILERPLATE = "ObjectBoilerplate",
  ODDBALL = "Oddball",
  SCOPE_INFO = "ScopeInfo",
  RAW = "Raw",
}

export abstract class ConstantEntry {
  constructor(
    public readonly index: number,
    public readonly type: ConstantType
  ) {}

  public abstract getValue(): any;
  public abstract toDisplayString(): string;
  public abstract cloneWithIndex(newIndex: number): ConstantEntry;
}

export class StringConstantEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly value: string,
    public readonly isEncrypted: boolean = false,
    public readonly encryptionKey?: number
  ) {
    super(index, ConstantType.STRING);
  }

  public getValue(): string {
    return this.value;
  }

  public toDisplayString(): string {
    return `"${this.value}"${this.isEncrypted ? " [ENCRYPTED]" : ""}`;
  }

  public cloneWithIndex(newIndex: number): StringConstantEntry {
    return new StringConstantEntry(newIndex, this.value, this.isEncrypted, this.encryptionKey);
  }

  public withEncryptedValue(newValue: string, key: number): StringConstantEntry {
    return new StringConstantEntry(this.index, newValue, true, key);
  }
}

export class NumberConstantEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly value: number
  ) {
    super(index, ConstantType.NUMBER);
  }

  public getValue(): number {
    return this.value;
  }

  public toDisplayString(): string {
    return String(this.value);
  }

  public cloneWithIndex(newIndex: number): NumberConstantEntry {
    return new NumberConstantEntry(newIndex, this.value);
  }
}

export class SfiConstantEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly functionName: string,
    public readonly address?: string
  ) {
    super(index, ConstantType.SHARED_FUNCTION_INFO);
  }

  public getValue(): string {
    return this.functionName;
  }

  public toDisplayString(): string {
    return `<SharedFunctionInfo: ${this.functionName}>`;
  }

  public cloneWithIndex(newIndex: number): SfiConstantEntry {
    return new SfiConstantEntry(newIndex, this.functionName, this.address);
  }
}

export class ArrayBoilerplateEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly elements: any[]
  ) {
    super(index, ConstantType.ARRAY_BOILERPLATE);
  }

  public getValue(): any[] {
    return this.elements;
  }

  public toDisplayString(): string {
    return `[${this.elements.join(", ")}]`;
  }

  public cloneWithIndex(newIndex: number): ArrayBoilerplateEntry {
    return new ArrayBoilerplateEntry(newIndex, [...this.elements]);
  }
}

export class ObjectBoilerplateEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly properties: Record<string, any>
  ) {
    super(index, ConstantType.OBJECT_BOILERPLATE);
  }

  public getValue(): Record<string, any> {
    return this.properties;
  }

  public toDisplayString(): string {
    return JSON.stringify(this.properties);
  }

  public cloneWithIndex(newIndex: number): ObjectBoilerplateEntry {
    return new ObjectBoilerplateEntry(newIndex, { ...this.properties });
  }
}

export class OddballEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly value: "undefined" | "null" | "true" | "false" | "the_hole"
  ) {
    super(index, ConstantType.ODDBALL);
  }

  public getValue(): string {
    return this.value;
  }

  public toDisplayString(): string {
    return `<Oddball: ${this.value}>`;
  }

  public cloneWithIndex(newIndex: number): OddballEntry {
    return new OddballEntry(newIndex, this.value);
  }
}

export class RawConstantEntry extends ConstantEntry {
  constructor(
    index: number,
    public readonly rawData: string | Uint8Array
  ) {
    super(index, ConstantType.RAW);
  }

  public getValue(): any {
    return this.rawData;
  }

  public toDisplayString(): string {
    return typeof this.rawData === "string" ? this.rawData : `<RawBytes: ${this.rawData.length}>`;
  }

  public cloneWithIndex(newIndex: number): RawConstantEntry {
    return new RawConstantEntry(newIndex, this.rawData);
  }
}

export class ConstantPool {
  private entries: ConstantEntry[];

  constructor(entries: ConstantEntry[] = []) {
    this.entries = [...entries];
  }

  public get size(): number {
    return this.entries.length;
  }

  public get(index: number): ConstantEntry | undefined {
    return this.entries[index];
  }

  public getAll(): ReadonlyArray<ConstantEntry> {
    return this.entries;
  }

  public getStrings(): StringConstantEntry[] {
    return this.entries.filter((e): e is StringConstantEntry => e instanceof StringConstantEntry);
  }

  public set(index: number, entry: ConstantEntry): void {
    this.entries[index] = entry;
  }

  public add(entry: ConstantEntry): number {
    const idx = this.entries.length;
    this.entries.push(entry.cloneWithIndex(idx));
    return idx;
  }

  public replace(index: number, updater: (prev: ConstantEntry) => ConstantEntry): void {
    const current = this.entries[index];
    if (current) {
      this.entries[index] = updater(current);
    }
  }

  public clone(): ConstantPool {
    return new ConstantPool(this.entries.map((e, idx) => e.cloneWithIndex(idx)));
  }

  public toJSON() {
    return this.entries.map(e => ({
      index: e.index,
      type: e.type,
      display: e.toDisplayString(),
    }));
  }
}
