import { ParseCodeCachePort } from "../../ports/inbound/parse-code-cache.port.ts";
import { StoragePort } from "../../ports/outbound/storage.port.ts";
import { BinaryCodecPort } from "../../ports/outbound/binary-codec.port.ts";
import { V8BinaryParser } from "../../adapters/outbound/binary/v8-binary-parser.ts";
import { CodeCache } from "../../domain/model/code-cache.ts";

export class ParseCodeCacheUseCase implements ParseCodeCachePort {
  constructor(
    private readonly storage: StoragePort,
    private readonly binaryCodec: BinaryCodecPort,
    private readonly v8Parser: V8BinaryParser
  ) {}

  public async parseFromBuffer(buffer: Buffer): Promise<CodeCache> {
    return this.binaryCodec.decode(buffer);
  }

  public async parseFromFile(filePath: string): Promise<CodeCache> {
    const buffer = await this.storage.readFile(filePath);
    return this.parseFromBuffer(buffer);
  }

  public async parseFromDisassemblyText(text: string): Promise<CodeCache> {
    return this.v8Parser.parseDisassemblyText(text);
  }
}
