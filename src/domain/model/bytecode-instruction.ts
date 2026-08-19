/**
 * Value Object representing a V8 Bytecode Instruction.
 * Supports V8 Ignition architecture (Accumulator, Registers, Immediates, Flags).
 */

export enum RegisterType {
  ACCUMULATOR = "ACCU",
  LOCAL = "r",
  ARGUMENT = "a",
  CONTEXT = "context",
  THIS = "this",
}

export class BytecodeRegister {
  constructor(
    public readonly type: RegisterType,
    public readonly index: number
  ) {}

  public static local(index: number): BytecodeRegister {
    return new BytecodeRegister(RegisterType.LOCAL, index);
  }

  public static arg(index: number): BytecodeRegister {
    return new BytecodeRegister(RegisterType.ARGUMENT, index);
  }

  public static accumulator(): BytecodeRegister {
    return new BytecodeRegister(RegisterType.ACCUMULATOR, 0);
  }

  public toString(): string {
    if (this.type === RegisterType.ACCUMULATOR) return "ACCU";
    if (this.type === RegisterType.THIS) return "<this>";
    if (this.type === RegisterType.CONTEXT) return "<context>";
    return `${this.type}${this.index}`;
  }
}

export interface BytecodeInstructionProps {
  offset: number;
  opcode: number;
  mnemonic: string;
  operands: Array<string | number | BytecodeRegister>;
  rawBytes?: Uint8Array;
  isDeadCode?: boolean;
}

export class BytecodeInstruction {
  constructor(private readonly props: BytecodeInstructionProps) {}

  public get offset(): number { return this.props.offset; }
  public get opcode(): number { return this.props.opcode; }
  public get mnemonic(): string { return this.props.mnemonic; }
  public get operands(): Array<string | number | BytecodeRegister> { return [...this.props.operands]; }
  public get rawBytes(): Uint8Array | undefined { return this.props.rawBytes; }
  public get isDeadCode(): boolean { return this.props.isDeadCode ?? false; }

  public withOffset(newOffset: number): BytecodeInstruction {
    return new BytecodeInstruction({ ...this.props, offset: newOffset });
  }

  public withOperands(newOperands: Array<string | number | BytecodeRegister>): BytecodeInstruction {
    return new BytecodeInstruction({ ...this.props, operands: newOperands });
  }

  public asDeadCode(): BytecodeInstruction {
    return new BytecodeInstruction({ ...this.props, isDeadCode: true });
  }

  public isJump(): boolean {
    return this.mnemonic.startsWith("Jump") || this.mnemonic.startsWith("Switch");
  }

  public isReturn(): boolean {
    return this.mnemonic === "Return";
  }

  public toString(): string {
    const ops = this.props.operands.map(op => {
      if (typeof op === "number") return `[${op}]`;
      if (op instanceof BytecodeRegister) return op.toString();
      return String(op);
    }).join(", ");
    return `@ ${this.props.offset.toString().padStart(4, " ")} : ${this.props.mnemonic} ${ops}`.trim();
  }

  public toJSON() {
    return {
      offset: this.props.offset,
      opcode: `0x${this.props.opcode.toString(16)}`,
      mnemonic: this.props.mnemonic,
      operands: this.props.operands.map(o => o.toString()),
      isDeadCode: this.props.isDeadCode,
    };
  }
}
