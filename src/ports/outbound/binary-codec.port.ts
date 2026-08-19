import { CodeCache } from "../../domain/model/code-cache.ts";

export interface BinaryCodecPort {
  decode(data: Buffer): CodeCache;
  encode(codeCache: CodeCache): Buffer;
}
