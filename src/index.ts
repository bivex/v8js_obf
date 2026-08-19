// Domain Models & Value Objects
export * from "./domain/model/code-cache-header.ts";
export * from "./domain/model/constant-pool.ts";
export * from "./domain/model/bytecode-instruction.ts";
export * from "./domain/model/handler-table.ts";
export * from "./domain/model/shared-function-info.ts";
export * from "./domain/model/code-cache.ts";

// Domain Events & Obfuscation
export * from "./domain/events/domain-events.ts";
export * from "./domain/obfuscation/base-mutator.ts";
export * from "./domain/obfuscation/checksum-service.ts";
export * from "./domain/obfuscation/string-encryptor-mutator.ts";
export * from "./domain/obfuscation/identifier-mangler-mutator.ts";
export * from "./domain/obfuscation/constant-scrambler-mutator.ts";
export * from "./domain/obfuscation/bytecode-junk-mutator.ts";
export * from "./domain/obfuscation/control-flow-mutator.ts";
export * from "./domain/obfuscation/mba-mutator.ts";
export * from "./domain/obfuscation/opaque-predicate-mutator.ts";
export * from "./domain/obfuscation/handler-table-mutator.ts";
export * from "./domain/obfuscation/fission-fusion-mutator.ts";
export * from "./domain/obfuscation/self-checksum-mutator.ts";
export * from "./domain/obfuscation/virtsc-engine.ts";
export * from "./domain/obfuscation/obfuscation-pipeline.ts";

// Ports
export * from "./ports/inbound/parse-code-cache.port.ts";
export * from "./ports/inbound/serialize-code-cache.port.ts";
export * from "./ports/inbound/obfuscate-code-cache.port.ts";
export * from "./ports/inbound/analyze-code-cache.port.ts";
export * from "./ports/outbound/binary-codec.port.ts";
export * from "./ports/outbound/storage.port.ts";
export * from "./ports/outbound/runtime-executor.port.ts";

// Application Use Cases
export * from "./application/use-cases/parse-code-cache.usecase.ts";
export * from "./application/use-cases/serialize-code-cache.usecase.ts";
export * from "./application/use-cases/obfuscate-code-cache.usecase.ts";
export * from "./application/use-cases/analyze-code-cache.usecase.ts";
export * from "./application/use-cases/compile-script.usecase.ts";
export * from "./application/use-cases/verify-code-cache.usecase.ts";

// Adapters & API Facade
export * from "./adapters/inbound/api/obfuscator-api.ts";
export * from "./adapters/outbound/binary/v8-binary-parser.ts";
export * from "./adapters/outbound/binary/v8-binary-serializer.ts";
export * from "./adapters/outbound/binary/v8-opcode-table.ts";
export * from "./adapters/outbound/storage/file-system.adapter.ts";
export * from "./adapters/outbound/runtime/node-vm.adapter.ts";
