import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("usage: node scripts/run-with-dotenv-local.mjs <command> [...args]");
  process.exit(2);
}

const [command, ...args] = argv;

// Resolve local bin scripts reliably on Windows (e.g. drizzle-kit.cmd).
const require = createRequire(import.meta.url);
let cmd = command;
let cmdArgs = args;

try {
  cmd = require.resolve(`${command}/package.json`).replace(/package\.json$/, "");
  // drizzle-kit's bin is typically `bin.cjs`
  cmd = `${cmd}bin.cjs`;
} catch {
  // fall back to PATH resolution via shell
}

const res = spawnSync(cmd, cmdArgs, {
  stdio: "inherit",
  env: process.env,
  shell: cmd === command,
});

process.exit(res.status ?? 1);
