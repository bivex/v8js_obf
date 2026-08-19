import { BinaryCodecPort } from "../../../ports/outbound/binary-codec.port.ts";
import { CodeCache } from "../../../domain/model/code-cache.ts";
import { CodeCacheHeader } from "../../../domain/model/code-cache-header.ts";
import { SharedFunctionInfo } from "../../../domain/model/shared-function-info.ts";
import { ConstantPool, StringConstantEntry, RawConstantEntry } from "../../../domain/model/constant-pool.ts";
import { HandlerTable } from "../../../domain/model/handler-table.ts";
import { BytecodeInstruction, BytecodeRegister } from "../../../domain/model/bytecode-instruction.ts";
import { V8ConstantParser } from "./v8-constant-parser.ts";
import { MNEMONIC_TO_OPCODE } from "./v8-opcode-table.ts";

export class V8BinaryParser implements BinaryCodecPort {
  /**
   * Decodes raw binary V8 SerializedCodeData into a domain CodeCache aggregate.
   */
  public decode(data: Buffer): CodeCache {
    if (data.length < CodeCacheHeader.HEADER_SIZE) {
      throw new Error(`Invalid V8 code cache buffer: size ${data.length} is less than header size 32`);
    }

    const header = CodeCacheHeader.fromBuffer(data);
    const payload = data.subarray(CodeCacheHeader.HEADER_SIZE);

    const codeCache = CodeCache.createEmpty(header);
    codeCache.setRawPayload(payload);

    // Extract embedded strings and functions from payload heuristics
    const rootSfi = this.extractSfiFromPayload(payload, header);
    codeCache.addFunction(rootSfi);
    codeCache.setRootFunctionId(rootSfi.id);

    return codeCache;
  }

  public encode(codeCache: CodeCache): Buffer {
    throw new Error("Use V8BinarySerializer for encoding");
  }

  /**
   * Parses View8 / V8 disassembly text format into a domain CodeCache aggregate.
   */
  public parseDisassemblyText(text: string): CodeCache {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const codeCache = CodeCache.createEmpty();
    let currentSfi: SharedFunctionInfo | null = null;
    let inConstPool = false;
    let inBytecode = false;
    let constEntries: any[] = [];
    let instructions: BytecodeInstruction[] = [];
    let handlerTable = new HandlerTable();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes("Start SharedFunctionInfo")) {
        inConstPool = false;
        inBytecode = false;
        constEntries = [];
        instructions = [];
        handlerTable = new HandlerTable();
        continue;
      }

      if (line.includes("[SharedFunctionInfo]") || line.includes("[BytecodeArray]")) {
        // Formats:
        // [SharedFunctionInfo] in [BytecodeArray] calculateTotal: [0x7f001]
        // [BytecodeArray] (0x1234):
        // func_myFunc_0x1234
        let name = "main";
        let addr = "0x0";

        const byteMatch = line.match(/\[BytecodeArray\]\s*([A-Za-z0-9_$]+)?\s*:\s*\[?(0x[0-9a-fA-F]+)\]?/);
        if (byteMatch) {
          name = byteMatch[1] || "main";
          addr = byteMatch[2] || "0x0";
        } else {
          const generalMatch = line.match(/(?:func_)?([A-Za-z0-9_$]+)[_\s:]+(0x[0-9a-fA-F]+)/);
          if (generalMatch) {
            name = generalMatch[1];
            addr = generalMatch[2];
          }
        }

        const id = `func_${name}_${addr}`;

        currentSfi = new SharedFunctionInfo({
          id,
          name,
          address: addr,
          parameterCount: 1,
          registerCount: 2,
          instructions: [],
          constantPool: new ConstantPool(),
          handlerTable: new HandlerTable(),
        });
        continue;
      }

      if (line.startsWith("Parameter count")) {
        const count = parseInt(line.replace("Parameter count", "").trim(), 10) || 1;
        if (currentSfi) (currentSfi as any).props.parameterCount = count;
        continue;
      }

      if (line.startsWith("Register count")) {
        const count = parseInt(line.replace("Register count", "").trim(), 10) || 0;
        if (currentSfi) currentSfi.setRegisterCount(count);
        continue;
      }

      if (line.startsWith("Constant pool")) {
        inConstPool = true;
        inBytecode = false;
        continue;
      }

      if (line.startsWith("Handler Table")) {
        inConstPool = false;
        inBytecode = false;
        continue;
      }

      if (line.includes("@") && line.includes(":")) {
        inBytecode = true;
        inConstPool = false;
        const inst = this.parseInstructionLine(line);
        if (inst) instructions.push(inst);
        continue;
      }

      if (inConstPool) {
        const match = line.match(/^(\d+(?:-\d+)?):\s*(?:0x[0-9a-fA-F]+\s*)?(.+)/);
        if (match) {
          const idx = parseInt(match[1].split("-").pop()!, 10);
          const rawVal = match[2];
          const entry = V8ConstantParser.parseConstantString(idx, rawVal);
          constEntries.push(entry);
        }
        continue;
      }

      if (line.includes("End SharedFunctionInfo") && currentSfi) {
        const pool = new ConstantPool(constEntries);
        (currentSfi as any).props.constantPool = pool;
        currentSfi.setInstructions(instructions);
        (currentSfi as any).props.handlerTable = handlerTable;
        codeCache.addFunction(currentSfi);

        if (codeCache.getAllFunctions().length === 1) {
          codeCache.setRootFunctionId(currentSfi.id);
        }
        currentSfi = null;
      }
    }

    return codeCache;
  }

  private parseInstructionLine(line: string): BytecodeInstruction | null {
    const match = line.match(/@\s*(\d+)\s*:\s*(?:[0-9a-fA-F]{2}\s+)*([A-Za-z0-9]+)\s*(.*)/);
    if (!match) return null;

    const offset = parseInt(match[1], 10);
    const mnemonic = match[2];
    const rawOps = match[3] ? match[3].split(",").map(s => s.trim()) : [];
    const opcode = MNEMONIC_TO_OPCODE[mnemonic] ?? 0x00;

    const operands: Array<string | number | BytecodeRegister> = rawOps.map(op => {
      if (op.startsWith("r")) return BytecodeRegister.local(parseInt(op.slice(1), 10) || 0);
      if (op.startsWith("a")) return BytecodeRegister.arg(parseInt(op.slice(1), 10) || 0);
      if (op === "ACCU") return BytecodeRegister.accumulator();
      if (op.startsWith("[") && op.endsWith("]")) return parseInt(op.slice(1, -1), 10) || 0;
      return op;
    });

    return new BytecodeInstruction({ offset, opcode, mnemonic, operands });
  }

  private extractSfiFromPayload(payload: Buffer, header: CodeCacheHeader): SharedFunctionInfo {
    const constantPool = new ConstantPool();
    let offset = 0;
    let constIdx = 0;

    while (offset < payload.length - 4) {
      if (payload[offset] > 32 && payload[offset] < 127) {
        let end = offset;
        while (end < payload.length && payload[end] >= 32 && payload[end] < 127) {
          end++;
        }
        if (end - offset >= 3) {
          const str = payload.subarray(offset, end).toString("utf-8");
          constantPool.add(new StringConstantEntry(constIdx++, str));
          offset = end;
          continue;
        }
      }
      offset++;
    }

    return new SharedFunctionInfo({
      id: "func_main_root",
      name: "main",
      parameterCount: 1,
      registerCount: 4,
      instructions: [
        new BytecodeInstruction({ offset: 0, opcode: 0x08, mnemonic: "LdaConstant", operands: [0] }),
        new BytecodeInstruction({ offset: 2, opcode: 0xa8, mnemonic: "Return", operands: [] }),
      ],
      constantPool,
      handlerTable: new HandlerTable(),
    });
  }
}
