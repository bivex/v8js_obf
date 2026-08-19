/**
 * Value Object representing the V8 SerializedCodeData Header.
 * In V8, the header contains magic numbers, version hashes, checksums, and payload lengths.
 */
export interface CodeCacheHeaderProps {
  magicNumber: number;     // e.g. 0xC0DE0628
  versionHash: number;     // V8 version / Node.js version commit hash
  sourceHash: number;      // Checksum / length of source string
  flagHash: number;        // V8 compilation flag hash
  payloadLength: number;   // Length of the serialized bytecode payload
  checksum: number;        // Payload integrity checksum (e.g. Adler32/CRC)
  reservationSize?: number;// Alignment & memory reservation table size
}

export class CodeCacheHeader {
  public static readonly HEADER_SIZE = 32; // 8 * 4 bytes standard V8 header
  public static readonly DEFAULT_MAGIC = 0xC0DE0628;

  private constructor(private readonly props: CodeCacheHeaderProps) {}

  public static create(props: CodeCacheHeaderProps): CodeCacheHeader {
    if (props.payloadLength < 0) {
      throw new Error("Payload length cannot be negative");
    }
    return new CodeCacheHeader({
      magicNumber: props.magicNumber || this.DEFAULT_MAGIC,
      versionHash: props.versionHash,
      sourceHash: props.sourceHash,
      flagHash: props.flagHash,
      payloadLength: props.payloadLength,
      checksum: props.checksum,
      reservationSize: props.reservationSize ?? 0,
    });
  }

  public get magicNumber(): number { return this.props.magicNumber; }
  public get versionHash(): number { return this.props.versionHash; }
  public get sourceHash(): number { return this.props.sourceHash; }
  public get flagHash(): number { return this.props.flagHash; }
  public get payloadLength(): number { return this.props.payloadLength; }
  public get checksum(): number { return this.props.checksum; }
  public get reservationSize(): number { return this.props.reservationSize ?? 0; }

  public withPayloadLength(newLength: number): CodeCacheHeader {
    return new CodeCacheHeader({ ...this.props, payloadLength: newLength });
  }

  public withChecksum(newChecksum: number): CodeCacheHeader {
    return new CodeCacheHeader({ ...this.props, checksum: newChecksum });
  }

  public withSourceHash(newSourceHash: number): CodeCacheHeader {
    return new CodeCacheHeader({ ...this.props, sourceHash: newSourceHash });
  }

  public toBuffer(): Buffer {
    const buf = Buffer.alloc(CodeCacheHeader.HEADER_SIZE);
    buf.writeUInt32LE(this.props.magicNumber >>> 0, 0);
    buf.writeUInt32LE(this.props.versionHash >>> 0, 4);
    buf.writeUInt32LE(this.props.sourceHash >>> 0, 8);
    buf.writeUInt32LE(this.props.flagHash >>> 0, 12);
    buf.writeUInt32LE(this.props.payloadLength >>> 0, 16);
    buf.writeUInt32LE(this.props.checksum >>> 0, 20);
    buf.writeUInt32LE(this.props.reservationSize ?? 0, 24);
    buf.writeUInt32LE(0, 28); // Padding / reserved
    return buf;
  }

  public static fromBuffer(buf: Buffer): CodeCacheHeader {
    if (buf.length < CodeCacheHeader.HEADER_SIZE) {
      throw new Error(`Buffer too small for V8 Header: expected ${CodeCacheHeader.HEADER_SIZE}, got ${buf.length}`);
    }
    return new CodeCacheHeader({
      magicNumber: buf.readUInt32LE(0),
      versionHash: buf.readUInt32LE(4),
      sourceHash: buf.readUInt32LE(8),
      flagHash: buf.readUInt32LE(12),
      payloadLength: buf.readUInt32LE(16),
      checksum: buf.readUInt32LE(20),
      reservationSize: buf.readUInt32LE(24),
    });
  }

  public toJSON() {
    return {
      magicNumber: `0x${this.props.magicNumber.toString(16)}`,
      versionHash: `0x${this.props.versionHash.toString(16)}`,
      sourceHash: `0x${this.props.sourceHash.toString(16)}`,
      flagHash: `0x${this.props.flagHash.toString(16)}`,
      payloadLength: this.props.payloadLength,
      checksum: `0x${this.props.checksum.toString(16)}`,
      reservationSize: this.props.reservationSize,
    };
  }
}
