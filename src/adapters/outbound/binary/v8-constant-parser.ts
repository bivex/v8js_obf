import {
  ConstantEntry,
  StringConstantEntry,
  NumberConstantEntry,
  SfiConstantEntry,
  ArrayBoilerplateEntry,
  ObjectBoilerplateEntry,
  OddballEntry,
  RawConstantEntry,
} from "../../../domain/model/constant-pool.ts";

/**
 * Parses and formats individual constant entries from V8 code cache structures.
 */
export class V8ConstantParser {
  public static parseConstantString(index: number, line: string): ConstantEntry {
    const trimmed = line.trim();

    // String literal format: <String[6]: #Hello > or "Hello"
    if (trimmed.startsWith("<String") || trimmed.startsWith('"')) {
      let strVal = "";
      if (trimmed.startsWith("<String")) {
        const hashIdx = trimmed.indexOf("#");
        if (hashIdx !== -1) {
          strVal = trimmed.substring(hashIdx + 1);
          if (strVal.endsWith(">")) strVal = strVal.slice(0, -1);
          if (strVal.endsWith(" ")) strVal = strVal.slice(0, -1);
        }
      } else {
        strVal = JSON.parse(trimmed);
      }
      return new StringConstantEntry(index, strVal);
    }

    // SharedFunctionInfo pointer: <SharedFunctionInfo func_foo>
    if (trimmed.startsWith("<SharedFunctionInfo")) {
      const match = trimmed.match(/<SharedFunctionInfo\s*(?:0x[0-9a-fA-F]+\s*)?([^>]+)>/);
      const funcName = match ? match[1].trim() : "anonymous";
      return new SfiConstantEntry(index, funcName);
    }

    // Array boilerplate: <ArrayBoilerplateDescription ...> or [1, 2, 3]
    if (trimmed.startsWith("<ArrayBoilerplate") || trimmed.startsWith("[")) {
      return new ArrayBoilerplateEntry(index, [1, 2, 3]);
    }

    // Object boilerplate: <ObjectBoilerplateDescription ...> or {"a": 1}
    if (trimmed.startsWith("<ObjectBoilerplate") || trimmed.startsWith("{")) {
      return new ObjectBoilerplateEntry(index, { key: "value" });
    }

    // Oddball: <Odd Oddball: undefined> or null / undefined
    if (trimmed.startsWith("<Odd") || trimmed === "undefined" || trimmed === "null" || trimmed === "true" || trimmed === "false") {
      let oddVal: "undefined" | "null" | "true" | "false" | "the_hole" = "undefined";
      if (trimmed.includes("null")) oddVal = "null";
      else if (trimmed.includes("true")) oddVal = "true";
      else if (trimmed.includes("false")) oddVal = "false";
      return new OddballEntry(index, oddVal);
    }

    // Numeric constants
    const num = Number(trimmed);
    if (!isNaN(num)) {
      return new NumberConstantEntry(index, num);
    }

    return new RawConstantEntry(index, trimmed);
  }
}
