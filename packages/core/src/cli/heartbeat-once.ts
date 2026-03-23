import path from "node:path";

import { runHeartbeatOnce } from "../heartbeat.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runHeartbeatOnce({
    heartbeatFilePath: args.heartbeatFilePath,
    now: args.now
  });

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]): { heartbeatFilePath: string; now: string } {
  let heartbeatFilePath = path.resolve(process.cwd(), "data/HEARTBEAT.md");
  let now = new Date().toISOString();

  for (const argument of argv) {
    if (argument.startsWith("--file=")) {
      heartbeatFilePath = path.resolve(process.cwd(), argument.slice("--file=".length));
      continue;
    }

    if (argument.startsWith("--now=")) {
      now = argument.slice("--now=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { heartbeatFilePath, now };
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error)
  );
  process.exitCode = 1;
});
