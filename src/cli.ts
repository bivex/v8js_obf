#!/usr/bin/env bun
import { CliHandler } from "./adapters/inbound/cli/cli-handler.ts";

const handler = new CliHandler();
handler.run(process.argv.slice(2));
