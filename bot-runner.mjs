// bot-runner.mjs – startet den Bot mit tsx
import { createRequire } from "module";
import { spawn } from "child_process";
import path from "path";

const proc = spawn(
  "npx",
  ["tsx", "--tsconfig", "tsconfig.json", "src/bot/index.ts"],
  { stdio: "inherit", shell: true }
);

proc.on("exit", (code) => process.exit(code ?? 0));
