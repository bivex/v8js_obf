import { V8ObfuscatorApi } from "../api/obfuscator-api.ts";
import { promises as fs } from "node:fs";

export class CliHandler {
  private readonly api = V8ObfuscatorApi.create();

  public async run(args: string[]): Promise<void> {
    const command = args[0];

    if (!command || command === "--help" || command === "-h") {
      this.printHelp();
      return;
    }

    try {
      switch (command) {
        case "compile":
          await this.handleCompile(args.slice(1));
          break;
        case "obfuscate":
          await this.handleObfuscate(args.slice(1));
          break;
        case "analyze":
          await this.handleAnalyze(args.slice(1));
          break;
        case "disasm":
          await this.handleDisasm(args.slice(1));
          break;
        case "verify":
          await this.handleVerify(args.slice(1));
          break;
        default:
          console.error(`Unknown command: ${command}`);
          this.printHelp();
          process.exit(1);
      }
    } catch (err: any) {
      console.error(`\x1b[31m[ERROR]\x1b[0m ${err.message}`);
      process.exit(1);
    }
  }

  private printHelp(): void {
    console.log(`
\x1b[1m\x1b[36mV8 Serialized Object & Code Cache Obfuscator (DDD Hexagonal CLI)\x1b[0m
\x1b[90mPowered by Bun & TypeScript\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  v8obf <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32mcompile\x1b[0m   <source.js> -o <output.v8cache>     Compile JS to V8 Code Cache binary
  \x1b[32mobfuscate\x1b[0m <input.v8cache|disasm.txt> -o <out>  Apply obfuscation mutators to Code Cache
  \x1b[32manalyze\x1b[0m   <input.v8cache|disasm.txt>          Analyze constant pools, instructions & security score
  \x1b[32mdisasm\x1b[0m    <input.v8cache> -o <disasm.txt>     Disassemble binary Code Cache to View8 format
  \x1b[32mverify\x1b[0m    <source.js> -c <cache.v8cache>      Test code cache execution in V8 runtime

\x1b[1mOPTIONS for 'obfuscate':\x1b[0m
  --profile <default|aggressive>   Set obfuscation aggression profile
  --no-strings                     Disable string XOR encryption
  --no-mangling                    Disable identifier scrambling
  --no-junk                        Disable bytecode dead opcode injection
  --control-flow                   Enable control-flow jump flattening
`);
  }

  private async handleCompile(args: string[]): Promise<void> {
    const inputIdx = 0;
    const inputFile = args[inputIdx];
    const outIdx = args.indexOf("-o");
    const outFile = outIdx !== -1 ? args[outIdx + 1] : "output.v8cache";

    if (!inputFile) throw new Error("Input JavaScript file required. Usage: v8obf compile <input.js> -o <out.v8cache>");

    console.log(`\x1b[34m[INFO]\x1b[0m Compiling \x1b[1m${inputFile}\x1b[0m to V8 code cache...`);
    const sourceCode = await fs.readFile(inputFile, "utf-8");
    const { codeCache, rawBuffer } = await this.api.compileUseCase.compile(sourceCode);
    await fs.writeFile(outFile, rawBuffer);
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Generated code cache \x1b[1m${outFile}\x1b[0m (${rawBuffer.length} bytes, Checksum: 0x${codeCache.getHeader().checksum.toString(16)})`);
  }

  private async handleObfuscate(args: string[]): Promise<void> {
    const inputFile = args[0];
    const outIdx = args.indexOf("-o");
    const outFile = outIdx !== -1 ? args[outIdx + 1] : "obfuscated.v8cache";
    const isAggressive = args.includes("--profile") && args[args.indexOf("--profile") + 1] === "aggressive";
    const controlFlow = args.includes("--control-flow");

    if (!inputFile) throw new Error("Input file required. Usage: v8obf obfuscate <input> -o <out>");

    console.log(`\x1b[34m[INFO]\x1b[0m Parsing \x1b[1m${inputFile}\x1b[0m...`);
    let codeCache;
    if (inputFile.endsWith(".txt") || inputFile.endsWith(".disasm")) {
      const text = await fs.readFile(inputFile, "utf-8");
      codeCache = await this.api.parseUseCase.parseFromDisassemblyText(text);
    } else {
      codeCache = await this.api.parseUseCase.parseFromFile(inputFile);
    }

    console.log(`\x1b[34m[INFO]\x1b[0m Executing Obfuscation Pipeline (${isAggressive ? "Aggressive" : "Standard"})...`);
    const { report } = await this.api.obfuscateUseCase.obfuscate(codeCache, {
      profile: isAggressive ? "aggressive" : "default",
      controlFlowFlatten: controlFlow,
    });

    for (const rep of report.mutatorReports) {
      console.log(`  \x1b[36m•\x1b[0m \x1b[1m${rep.mutatorName}\x1b[0m: ${rep.description}`);
    }

    if (outFile.endsWith(".txt") || outFile.endsWith(".disasm")) {
      const disasm = this.api.serializeUseCase.serializeToDisassemblyText(codeCache);
      await fs.writeFile(outFile, disasm, "utf-8");
    } else {
      await this.api.serializeUseCase.serializeToFile(codeCache, outFile);
    }

    console.log(`\x1b[32m[SUCCESS]\x1b[0m Obfuscated cache written to \x1b[1m${outFile}\x1b[0m (Checksum updated: 0x${report.newChecksum.toString(16)})`);
  }

  private async handleAnalyze(args: string[]): Promise<void> {
    const inputFile = args[0];
    if (!inputFile) throw new Error("Input file required. Usage: v8obf analyze <file>");

    let codeCache;
    if (inputFile.endsWith(".txt") || inputFile.endsWith(".disasm")) {
      const text = await fs.readFile(inputFile, "utf-8");
      codeCache = await this.api.parseUseCase.parseFromDisassemblyText(text);
    } else {
      codeCache = await this.api.parseUseCase.parseFromFile(inputFile);
    }

    const summary = this.api.analyzeUseCase.analyze(codeCache);
    console.log(`\n\x1b[1m\x1b[35m=== V8 Code Cache Analysis Report ===\x1b[0m`);
    console.log(`  V8 Version Hash:    \x1b[33m${summary.version}\x1b[0m`);
    console.log(`  Payload Checksum:   \x1b[33m${summary.checksum}\x1b[0m`);
    console.log(`  Total Functions:    \x1b[1m${summary.totalFunctions}\x1b[0m`);
    console.log(`  Total Instructions: \x1b[1m${summary.totalInstructions}\x1b[0m`);
    console.log(`  Constant Pool Size: \x1b[1m${summary.totalConstants}\x1b[0m (Strings: ${summary.stringCount})`);
    console.log(`  Security/Obf Score: \x1b[1m\x1b[32m${summary.securityScore} / 100\x1b[0m`);
    console.log(`\n\x1b[1mFunction Signatures:\x1b[0m`);
    for (const sig of summary.functionSignatures) {
      console.log(`  - ${sig}`);
    }
    console.log();
  }

  private async handleDisasm(args: string[]): Promise<void> {
    const inputFile = args[0];
    const outIdx = args.indexOf("-o");
    const outFile = outIdx !== -1 ? args[outIdx + 1] : undefined;

    if (!inputFile) throw new Error("Input file required. Usage: v8obf disasm <input.v8cache> [-o <out.txt>]");

    const codeCache = await this.api.parseUseCase.parseFromFile(inputFile);
    const disasm = this.api.serializeUseCase.serializeToDisassemblyText(codeCache);

    if (outFile) {
      await fs.writeFile(outFile, disasm, "utf-8");
      console.log(`\x1b[32m[SUCCESS]\x1b[0m Disassembly written to \x1b[1m${outFile}\x1b[0m`);
    } else {
      console.log(disasm);
    }
  }

  private async handleVerify(args: string[]): Promise<void> {
    const inputFile = args[0];
    const cacheIdx = args.indexOf("-c");
    const cacheFile = cacheIdx !== -1 ? args[cacheIdx + 1] : `${inputFile}.v8cache`;

    if (!inputFile) throw new Error("Usage: v8obf verify <source.js> -c <cache.v8cache>");

    const source = await fs.readFile(inputFile, "utf-8");
    const cacheBuf = await fs.readFile(cacheFile);

    console.log(`\x1b[34m[INFO]\x1b[0m Verifying code cache with V8 runtime...`);
    const res = await this.api.runtime.executeWithCodeCache(source, cacheBuf);

    if (res.success) {
      console.log(`\x1b[32m[SUCCESS]\x1b[0m Code cache executed in ${res.executionTimeMs}ms!`);
      console.log(`  Cached data rejected: \x1b[1m${res.cachedDataRejected}\x1b[0m`);
      if (res.output) console.log(`  Output: ${res.output}`);
    } else {
      console.error(`\x1b[31m[FAILED]\x1b[0m Execution failed: ${res.error}`);
    }
  }
}
