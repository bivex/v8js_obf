import { BytecodeInstruction } from "./bytecode-instruction.ts";
import { ConstantPool } from "./constant-pool.ts";
import { HandlerTable } from "./handler-table.ts";

/**
 * Domain Entity representing a V8 SharedFunctionInfo (SFI).
 * Encapsulates the function's bytecode array, constant pool, parameters, and metadata.
 */
export interface SharedFunctionInfoProps {
  id: string;
  name: string;
  parameterCount: number;
  registerCount: number;
  instructions: BytecodeInstruction[];
  constantPool: ConstantPool;
  handlerTable: HandlerTable;
  address?: string;
  parentFunctionId?: string;
  childFunctions?: string[]; // IDs of nested functions
  sourcePositionTable?: Uint8Array;
}

export class SharedFunctionInfo {
  private props: SharedFunctionInfoProps;

  constructor(props: SharedFunctionInfoProps) {
    this.props = {
      ...props,
      childFunctions: props.childFunctions ? [...props.childFunctions] : [],
    };
  }

  public get id(): string { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get parameterCount(): number { return this.props.parameterCount; }
  public get registerCount(): number { return this.props.registerCount; }
  public get instructions(): ReadonlyArray<BytecodeInstruction> { return this.props.instructions; }
  public get constantPool(): ConstantPool { return this.props.constantPool; }
  public get handlerTable(): HandlerTable { return this.props.handlerTable; }
  public get address(): string | undefined { return this.props.address; }
  public get parentFunctionId(): string | undefined { return this.props.parentFunctionId; }
  public get childFunctions(): ReadonlyArray<string> { return this.props.childFunctions ?? []; }

  public setName(newName: string): void {
    this.props.name = newName;
  }

  public setRegisterCount(count: number): void {
    this.props.registerCount = Math.max(0, count);
  }

  public setInstructions(instructions: BytecodeInstruction[]): void {
    this.props.instructions = [...instructions];
  }

  public insertInstruction(index: number, instruction: BytecodeInstruction): void {
    this.props.instructions.splice(index, 0, instruction);
    this.recalculateInstructionOffsets();
  }

  public replaceInstruction(index: number, instruction: BytecodeInstruction): void {
    if (index >= 0 && index < this.props.instructions.length) {
      this.props.instructions[index] = instruction;
    }
  }

  public addChildFunction(childId: string): void {
    if (!this.props.childFunctions) this.props.childFunctions = [];
    if (!this.props.childFunctions.includes(childId)) {
      this.props.childFunctions.push(childId);
    }
  }

  public recalculateInstructionOffsets(): void {
    let currentOffset = 0;
    this.props.instructions = this.props.instructions.map((inst) => {
      const updated = inst.withOffset(currentOffset);
      currentOffset += inst.rawBytes?.length || 2; // rough estimated bytecode size
      return updated;
    });
  }

  public getSignature(): string {
    const args = Array.from({ length: Math.max(0, this.props.parameterCount - 1) }, (_, i) => `a${i}`).join(", ");
    return `function ${this.props.name}(${args}) [registers: ${this.props.registerCount}]`;
  }

  public toJSON() {
    return {
      id: this.props.id,
      name: this.props.name,
      signature: this.getSignature(),
      parameterCount: this.props.parameterCount,
      registerCount: this.props.registerCount,
      instructionCount: this.props.instructions.length,
      constantPoolSize: this.props.constantPool.size,
      childFunctions: this.props.childFunctions,
      address: this.props.address,
    };
  }
}
