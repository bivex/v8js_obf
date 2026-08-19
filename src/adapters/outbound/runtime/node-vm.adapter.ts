import { RuntimeExecutorPort, ExecutionResult } from "../../../ports/outbound/runtime-executor.port.ts";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class NodeVmAdapter implements RuntimeExecutorPort {
  /**
   * Compiles JavaScript source code to V8 Code Cache buffer using Node.js vm module.
   */
  public async compileToCodeCache(sourceCode: string): Promise<{ codeCacheBuffer: Buffer; sourceCode: string }> {
    const tmpScript = join(tmpdir(), `v8_compile_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
    const tmpCache = `${tmpScript}.v8cache`;

    const runnerJs = `
const vm = require('vm');
const fs = require('fs');
const code = fs.readFileSync(${JSON.stringify(tmpScript)}, 'utf-8');
const script = new vm.Script(code, { produceCachedData: true });
const cachedData = script.createCachedData();
fs.writeFileSync(${JSON.stringify(tmpCache)}, cachedData);
`;

    try {
      await fs.writeFile(tmpScript, sourceCode, "utf-8");
      await this.runNodeScript(runnerJs);
      const codeCacheBuffer = await fs.readFile(tmpCache);
      return { codeCacheBuffer, sourceCode };
    } finally {
      await fs.unlink(tmpScript).catch(() => {});
      await fs.unlink(tmpCache).catch(() => {});
    }
  }

  /**
   * Executes a code cache with Node.js V8 runtime and tests if it executes cleanly.
   */
  public async executeWithCodeCache(sourceCode: string, codeCacheBuffer: Buffer): Promise<ExecutionResult> {
    const startTime = Date.now();
    const tmpScript = join(tmpdir(), `v8_run_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
    const tmpCache = `${tmpScript}.v8cache`;

    const runnerJs = `
const vm = require('vm');
const fs = require('fs');
const code = fs.readFileSync(${JSON.stringify(tmpScript)}, 'utf-8');
const cachedData = fs.readFileSync(${JSON.stringify(tmpCache)});

try {
  const script = new vm.Script(code, { cachedData });
  const rejected = script.cachedDataRejected;
  console.log('__V8_REJECTED__:' + rejected);
  const result = script.runInThisContext();
  if (result !== undefined) console.log(result);
} catch (e) {
  console.error('__V8_ERROR__:' + e.message);
  process.exit(1);
}
`;

    try {
      await fs.writeFile(tmpScript, sourceCode, "utf-8");
      await fs.writeFile(tmpCache, codeCacheBuffer);

      const output = await this.runNodeScript(runnerJs);
      const rejectedMatch = output.match(/__V8_REJECTED__:(true|false)/);
      const cachedDataRejected = rejectedMatch ? rejectedMatch[1] === "true" : false;

      return {
        success: true,
        output: output.replace(/__V8_REJECTED__:(true|false)\n?/, "").trim(),
        cachedDataRejected,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      await fs.unlink(tmpScript).catch(() => {});
      await fs.unlink(tmpCache).catch(() => {});
    }
  }

  private runNodeScript(scriptCode: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("node", ["-e", scriptCode]);
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", chunk => { stdout += chunk; });
      child.stderr.on("data", chunk => { stderr += chunk; });

      child.on("close", code => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout || `Process exited with code ${code}`));
        }
      });
    });
  }
}
