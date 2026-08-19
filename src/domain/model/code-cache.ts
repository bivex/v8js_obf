import { CodeCacheHeader } from "./code-cache-header.ts";
import { SharedFunctionInfo } from "./shared-function-info.ts";

/**
 * Root Aggregate representing the complete V8 Serialized Code Cache.
 * Holds the Header, all SharedFunctionInfos in the compilation unit,
 * and maintains domain integrity during obfuscation and serialization.
 */
export interface CodeCacheProps {
  header: CodeCacheHeader;
  rootFunctionId: string;
  functions: Map<string, SharedFunctionInfo>;
  rawPayload?: Buffer;
  sourceCodeSnippet?: string;
}

export class CodeCache {
  private header: CodeCacheHeader;
  private rootFunctionId: string;
  private functions: Map<string, SharedFunctionInfo>;
  private rawPayload?: Buffer;
  private sourceCodeSnippet?: string;

  constructor(props: CodeCacheProps) {
    this.header = props.header;
    this.rootFunctionId = props.rootFunctionId;
    this.functions = new Map(props.functions);
    this.rawPayload = props.rawPayload;
    this.sourceCodeSnippet = props.sourceCodeSnippet;
  }

  public static createEmpty(header?: CodeCacheHeader): CodeCache {
    const defHeader = header || CodeCacheHeader.create({
      magicNumber: CodeCacheHeader.DEFAULT_MAGIC,
      versionHash: 0x79dafe74,
      sourceHash: 0,
      flagHash: 0,
      payloadLength: 0,
      checksum: 0,
    });
    return new CodeCache({
      header: defHeader,
      rootFunctionId: "func_main_0x0",
      functions: new Map(),
    });
  }

  public getHeader(): CodeCacheHeader {
    return this.header;
  }

  public updateHeader(newHeader: CodeCacheHeader): void {
    this.header = newHeader;
  }

  public getRootFunction(): SharedFunctionInfo | undefined {
    return this.functions.get(this.rootFunctionId);
  }

  public getRootFunctionId(): string {
    return this.rootFunctionId;
  }

  public setRootFunctionId(id: string): void {
    this.rootFunctionId = id;
  }

  public addFunction(sfi: SharedFunctionInfo): void {
    this.functions.set(sfi.id, sfi);
  }

  public getFunction(id: string): SharedFunctionInfo | undefined {
    return this.functions.get(id);
  }

  public getAllFunctions(): SharedFunctionInfo[] {
    return Array.from(this.functions.values());
  }

  public getFunctionCount(): number {
    return this.functions.size;
  }

  public getRawPayload(): Buffer | undefined {
    return this.rawPayload;
  }

  public setRawPayload(payload: Buffer): void {
    this.rawPayload = payload;
    this.header = this.header.withPayloadLength(payload.length);
  }

  public getSourceSnippet(): string | undefined {
    return this.sourceCodeSnippet;
  }

  public setSourceSnippet(snippet: string): void {
    this.sourceCodeSnippet = snippet;
  }

  public toJSON() {
    return {
      header: this.header.toJSON(),
      rootFunctionId: this.rootFunctionId,
      totalFunctions: this.functions.size,
      functions: this.getAllFunctions().map(f => f.toJSON()),
    };
  }
}
