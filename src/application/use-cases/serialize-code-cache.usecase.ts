import { SerializeCodeCachePort } from "../../ports/inbound/serialize-code-cache.port.ts";
import { StoragePort } from "../../ports/outbound/storage.port.ts";
import { BinaryCodecPort } from "../../ports/outbound/binary-codec.port.ts";
import { V8BinarySerializer } from "../../adapters/outbound/binary/v8-binary-serializer.ts";
import { CodeCache } from "../../domain/model/code-cache.ts";

export class SerializeCodeCacheUseCase implements SerializeCodeCachePort {
  constructor(
    private readonly storage: StoragePort,
    private readonly binaryCodec: BinaryCodecPort,
    private readonly serializer: V8BinarySerializer
  ) {}

  public async serializeToBuffer(codeCache: CodeCache): Promise<Buffer> {
    return this.binaryCodec.encode(codeCache);
  }

  public async serializeToFile(codeCache: CodeCache, filePath: string): Promise<void> {
    const buffer = await this.serializeToBuffer(codeCache);
    await this.storage.writeFile(filePath, buffer);
  }

  public serializeToDisassemblyText(codeCache: CodeCache): string {
    return this.serializer.toDisassemblyText(codeCache);
  }
}
