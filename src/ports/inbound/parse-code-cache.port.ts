import { CodeCache } from "../../domain/model/code-cache.ts";

export interface ParseCodeCachePort {
  parseFromBuffer(buffer: Buffer): Promise<CodeCache>;
  parseFromFile(filePath: string): Promise<CodeCache>;
  parseFromDisassemblyText(text: string): Promise<CodeCache>;
}
