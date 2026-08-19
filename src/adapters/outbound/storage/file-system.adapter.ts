import { StoragePort } from "../../../ports/outbound/storage.port.ts";
import { promises as fs } from "node:fs";

export class FileSystemAdapter implements StoragePort {
  public async readFile(path: string): Promise<Buffer> {
    return await fs.readFile(path);
  }

  public async writeFile(path: string, data: Buffer): Promise<void> {
    await fs.writeFile(path, data);
  }

  public async readText(path: string): Promise<string> {
    return await fs.readFile(path, "utf-8");
  }

  public async writeText(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, "utf-8");
  }

  public async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}
