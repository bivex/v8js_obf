/**
 * V8 Ignition Bytecode Opcode definitions & tables.
 */
export interface OpcodeDefinition {
  code: number;
  mnemonic: string;
  operandTypes: string[];
}

export const V8_OPCODES: Record<number, OpcodeDefinition> = {
  0x00: { code: 0x00, mnemonic: "Nop", operandTypes: [] },
  0x01: { code: 0x01, mnemonic: "LdaZero", operandTypes: [] },
  0x02: { code: 0x02, mnemonic: "LdaSmi", operandTypes: ["Immediate"] },
  0x03: { code: 0x03, mnemonic: "LdaUndefined", operandTypes: [] },
  0x04: { code: 0x04, mnemonic: "LdaNull", operandTypes: [] },
  0x05: { code: 0x05, mnemonic: "LdaTheHole", operandTypes: [] },
  0x06: { code: 0x06, mnemonic: "LdaTrue", operandTypes: [] },
  0x07: { code: 0x07, mnemonic: "LdaFalse", operandTypes: [] },
  0x08: { code: 0x08, mnemonic: "LdaConstant", operandTypes: ["Idx"] },
  0x0b: { code: 0x0b, mnemonic: "Ldar", operandTypes: ["Reg"] },
  0x0c: { code: 0x0c, mnemonic: "Star", operandTypes: ["Reg"] },
  0x0d: { code: 0x0d, mnemonic: "Mov", operandTypes: ["Reg", "Reg"] },
  0x14: { code: 0x14, mnemonic: "LdaGlobal", operandTypes: ["Idx", "Idx"] },
  0x15: { code: 0x15, mnemonic: "LdaGlobalInsideTypeof", operandTypes: ["Idx", "Idx"] },
  0x16: { code: 0x16, mnemonic: "StaGlobal", operandTypes: ["Idx", "Idx"] },
  0x18: { code: 0x18, mnemonic: "LdaContextSlot", operandTypes: ["Reg", "Idx", "Idx"] },
  0x19: { code: 0x19, mnemonic: "StaContextSlot", operandTypes: ["Reg", "Idx", "Idx"] },
  0x2b: { code: 0x2b, mnemonic: "LdaNamedProperty", operandTypes: ["Reg", "Idx", "Idx"] },
  0x2d: { code: 0x2d, mnemonic: "LdaKeyedProperty", operandTypes: ["Reg", "Idx"] },
  0x35: { code: 0x35, mnemonic: "SetNamedProperty", operandTypes: ["Reg", "Idx", "Idx"] },
  0x36: { code: 0x36, mnemonic: "SetKeyedProperty", operandTypes: ["Reg", "Reg", "Idx"] },
  0x38: { code: 0x38, mnemonic: "Add", operandTypes: ["Reg", "Idx"] },
  0x39: { code: 0x39, mnemonic: "Sub", operandTypes: ["Reg", "Idx"] },
  0x3a: { code: 0x3a, mnemonic: "Mul", operandTypes: ["Reg", "Idx"] },
  0x3b: { code: 0x3b, mnemonic: "Div", operandTypes: ["Reg", "Idx"] },
  0x3c: { code: 0x3c, mnemonic: "Mod", operandTypes: ["Reg", "Idx"] },
  0x5f: { code: 0x5f, mnemonic: "CallProperty", operandTypes: ["Reg", "RegList", "Idx"] },
  0x60: { code: 0x60, mnemonic: "CallProperty0", operandTypes: ["Reg", "Reg", "Idx"] },
  0x61: { code: 0x61, mnemonic: "CallProperty1", operandTypes: ["Reg", "Reg", "Reg", "Idx"] },
  0x62: { code: 0x62, mnemonic: "CallProperty2", operandTypes: ["Reg", "Reg", "Reg", "Reg", "Idx"] },
  0x63: { code: 0x63, mnemonic: "CallUndefinedReceiver", operandTypes: ["Reg", "RegList", "Idx"] },
  0x64: { code: 0x64, mnemonic: "CallUndefinedReceiver0", operandTypes: ["Reg", "Idx"] },
  0x65: { code: 0x65, mnemonic: "CallUndefinedReceiver1", operandTypes: ["Reg", "Reg", "Idx"] },
  0x68: { code: 0x68, mnemonic: "CallRuntime", operandTypes: ["RuntimeId", "RegList"] },
  0x6b: { code: 0x6b, mnemonic: "Construct", operandTypes: ["Reg", "RegList", "Idx"] },
  0x70: { code: 0x70, mnemonic: "TestEqual", operandTypes: ["Reg", "Idx"] },
  0x73: { code: 0x73, mnemonic: "TestLessThan", operandTypes: ["Reg", "Idx"] },
  0x74: { code: 0x74, mnemonic: "TestGreaterThan", operandTypes: ["Reg", "Idx"] },
  0x7a: { code: 0x7a, mnemonic: "Jump", operandTypes: ["UImm"] },
  0x7c: { code: 0x7c, mnemonic: "JumpIfTrue", operandTypes: ["UImm"] },
  0x7d: { code: 0x7d, mnemonic: "JumpIfFalse", operandTypes: ["UImm"] },
  0x7e: { code: 0x7e, mnemonic: "JumpIfNull", operandTypes: ["UImm"] },
  0x7f: { code: 0x7f, mnemonic: "JumpIfUndefined", operandTypes: ["UImm"] },
  0x87: { code: 0x87, mnemonic: "JumpLoop", operandTypes: ["UImm", "Idx"] },
  0x89: { code: 0x89, mnemonic: "SwitchOnSmiNoFeedback", operandTypes: ["Idx", "UImm", "UImm"] },
  0xa8: { code: 0xa8, mnemonic: "Return", operandTypes: [] },
  0xaa: { code: 0xaa, mnemonic: "Throw", operandTypes: [] },
  0xab: { code: 0xab, mnemonic: "ReThrow", operandTypes: [] },
};

export const MNEMONIC_TO_OPCODE: Record<string, number> = Object.fromEntries(
  Object.entries(V8_OPCODES).map(([code, def]) => [def.mnemonic, Number(code)])
);
