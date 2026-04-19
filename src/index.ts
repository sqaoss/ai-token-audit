#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parseSections } from "./parse.ts";
import { auditFile, formatAudit, type FileAudit } from "./report.ts";

const USAGE = `
ai-token-audit — static linter for AI-agent config files (v0.1.0)

Usage:
  ai-token-audit [files...] [options]

If no files are given, auto-detects CLAUDE.md and AGENTS.md in the CWD.

Options:
  --all            Show every section, not just the top 10 heaviest.
  --json           Emit machine-readable JSON instead of the formatted table.
  --no-color       Disable ANSI colour even on a TTY.
  -h, --help       Print this message.
  -v, --version    Print version.

Tokens are counted with the cl100k_base BPE (OpenAI's tokeniser) as an offline
approximation of Claude's. Relative ranking between sections is stable; absolute
counts are typically within ~5%. A --accurate mode using Anthropic's count_tokens
API is planned for v0.2.

Disclosure: this tool is authored and maintained by an AI agent.
`.trim();

const DEFAULT_TARGETS = ["CLAUDE.md", "AGENTS.md"];

type Argv = {
  files: string[];
  showAll: boolean;
  json: boolean;
  color: boolean | null;
};

function parseArgv(argv: string[]): Argv | null {
  const out: Argv = { files: [], showAll: false, json: false, color: null };
  for (const a of argv) {
    if (a === "-h" || a === "--help") return null;
    if (a === "-v" || a === "--version") {
      console.log("0.1.0");
      process.exit(0);
    }
    if (a === "--all") out.showAll = true;
    else if (a === "--json") out.json = true;
    else if (a === "--no-color") out.color = false;
    else if (a.startsWith("--")) {
      console.error(`ai-token-audit: unknown flag '${a}'`);
      process.exit(2);
    } else out.files.push(a);
  }
  return out;
}

async function main() {
  const argv = parseArgv(process.argv.slice(2));
  if (!argv) {
    console.log(USAGE);
    return;
  }

  const cwd = process.cwd();
  let targets = argv.files;
  if (targets.length === 0) {
    targets = DEFAULT_TARGETS.filter((f) => existsSync(resolve(cwd, f)));
    if (targets.length === 0) {
      console.error(
        "ai-token-audit: no CLAUDE.md or AGENTS.md in the current directory, and no files passed.",
      );
      console.error("Run `ai-token-audit --help` for usage.");
      process.exit(1);
    }
  }

  const audits: FileAudit[] = [];
  for (const raw of targets) {
    const abs = resolve(cwd, raw);
    if (!existsSync(abs)) {
      console.error(`ai-token-audit: file not found: ${raw}`);
      process.exit(1);
    }
    const src = await readFile(abs, "utf8");
    const sections = parseSections(src);
    audits.push(auditFile(relative(cwd, abs) || abs, src, sections));
  }

  if (argv.json) {
    process.stdout.write(JSON.stringify({ version: "0.1.0", audits }, null, 2) + "\n");
    return;
  }

  for (const a of audits) {
    process.stdout.write(
      formatAudit(a, { showAll: argv.showAll, color: argv.color ?? undefined }) + "\n",
    );
  }

  if (audits.length > 1) {
    const totalTokens = audits.reduce((acc, a) => acc + a.totalTokens, 0);
    process.stdout.write(`\n  Combined total: ${totalTokens.toLocaleString()} tokens across ${audits.length} files.\n`);
  }
}

main().catch((err) => {
  console.error("ai-token-audit: fatal:", err?.stack ?? err);
  process.exit(1);
});
