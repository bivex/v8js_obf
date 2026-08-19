/**
 * Domain Events emitted during V8 Code Cache lifecycle and obfuscation.
 */
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, any>;
}

export class FunctionMutatedEvent implements DomainEvent {
  public readonly eventName = "FunctionMutated";
  public readonly occurredAt = new Date();
  constructor(public readonly payload: { functionId: string; mutatorName: string; details: string }) {}
}

export class StringEncryptedEvent implements DomainEvent {
  public readonly eventName = "StringEncrypted";
  public readonly occurredAt = new Date();
  constructor(public readonly payload: { functionId: string; originalString: string; encryptedString: string; key: number }) {}
}

export class JunkInjectedEvent implements DomainEvent {
  public readonly eventName = "JunkInjected";
  public readonly occurredAt = new Date();
  constructor(public readonly payload: { functionId: string; injectedCount: number }) {}
}

export class ChecksumRecalculatedEvent implements DomainEvent {
  public readonly eventName = "ChecksumRecalculated";
  public readonly occurredAt = new Date();
  constructor(public readonly payload: { oldChecksum: number; newChecksum: number; algorithm: string }) {}
}
