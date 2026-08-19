# V8 Serialized Objects & Code Cache Obfuscator

> **DDD Hexagonal Architecture (Ports & Adapters) Application** implemented in **TypeScript** on **Bun** for inspecting, manipulating, and obfuscating V8 Serialized Code Cache (`vm.Script.createCachedData`) and Bytecode objects.

---

## 🏛 Hexagonal Architecture Overview

```
                      +---------------------------------------+
                      |          Inbound Adapters             |
                      |   CLI Handler  / Programmatic API     |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |             Inbound Ports             |
                      |  ParseCodeCache   /  ObfuscateCode    |
                      |  SerializeCode    /  AnalyzeCode      |
                      +-------------------+-------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                  DOMAIN LAYER                                     |
|                                                                                   |
|  [Root Aggregate]              [Entities & Value Objects]       [Domain Events]   |
|   - CodeCache                   - CodeCacheHeader (VO)           - FunctionMutated|
|                                 - SharedFunctionInfo             - StringEncrypted|
|  [Domain Services]              - ConstantPool / ConstantEntries - JunkInjected   |
|   - ChecksumService (Adler32)   - BytecodeInstruction (VO)       - ChecksumUpdated|
|   - ObfuscationPipeline         - HandlerTable (VO)                               |
|                                                                                   |
|  [Obfuscation Strategy Mutators]                                                  |
|   - StringEncryptorMutator      - IdentifierManglerMutator                        |
|   - ConstantScramblerMutator    - BytecodeJunkMutator                             |
|   - ControlFlowMutator          - OpaquePredicateMutator                          |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |            Outbound Ports             |
                      |  BinaryCodecPort  / StoragePort       |
                      |  RuntimeExecutorPort                  |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |          Outbound Adapters            |
                      |  V8BinaryCodec (Parser & Serializer)  |
                      |  FileSystemStorage                    |
                      |  NodeVmRuntime (vm.Script executor)   |
                      +---------------------------------------+
```

---

## 🚀 Quick Start with Bun

### 1. Install & Test
```bash
# Run unit & integration test suite
bun test

# Typecheck
bun run typecheck
```

### 2. CLI Usage
```bash
# 1. Compile JavaScript source code to V8 code cache binary
bun src/cli.ts compile app.js -o app.v8cache

# 2. Analyze the code cache internals & security score
bun src/cli.ts analyze app.v8cache

# 3. Obfuscate the code cache (encrypts strings, shuffles constants, injects dead opcodes, recalculates Adler32)
bun src/cli.ts obfuscate app.v8cache -o app.obf.v8cache --profile aggressive

# 4. Disassemble binary code cache to View8 text format
bun src/cli.ts disasm app.obf.v8cache -o disasm.txt

# 5. Verify and execute with V8 runtime
bun src/cli.ts verify app.js -c app.obf.v8cache
```

---

## 🛠 Programmatic API Usage

```typescript
import { V8ObfuscatorApi } from "./src";

const api = V8ObfuscatorApi.create();

// Obfuscate JavaScript code directly into protected V8 Code Cache
const { obfuscatedBuffer, disassembly, stats } = await api.obfuscateScript(
  `function authenticate(token) { return token === "SUPER_SECRET"; }`,
  { profile: "aggressive" }
);

console.log("Obfuscated V8 payload size:", obfuscatedBuffer.length);
console.log("Mutations applied:", stats.mutationsApplied);
```

---

## 📂 Project Structure

- `src/domain/model/`: Pure domain entities (`CodeCache`, `CodeCacheHeader`, `SharedFunctionInfo`, `ConstantPool`, `BytecodeInstruction`, `HandlerTable`).
- `src/domain/obfuscation/`: Strategy pattern mutators (`StringEncryptor`, `IdentifierMangler`, `ConstantScrambler`, `BytecodeJunk`, `ControlFlow`).
- `src/ports/`: Inbound and Outbound contracts (Hexagonal ports).
- `src/application/use-cases/`: Orchestration use cases (`ParseCodeCache`, `ObfuscateCodeCache`, `AnalyzeCodeCache`, `CompileScript`, `VerifyCodeCache`).
- `src/adapters/`:
  - `inbound/`: `cli-handler.ts`, `obfuscator-api.ts`.
  - `outbound/`: `v8-binary-parser.ts`, `v8-binary-serializer.ts`, `v8-opcode-table.ts`, `file-system.adapter.ts`, `node-vm.adapter.ts`.
- `tests/`: Domain, adapter, usecase, and end-to-end integration tests.
