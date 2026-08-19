import { CodeCache } from "../../domain/model/code-cache.ts";

export interface SerializeCodeCachePort {
  serializeToBuffer(codeCache: CodeCache): Promise<Buffer>;
  serializeToFile(codeCache: CodeCache, filePath: string): Promise<void>;
  serializeToDisassemblyText(codeCache: CodeCache): string;
}
