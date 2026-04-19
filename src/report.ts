import type { Section } from "./parse.ts";
import { countTokens } from "./tokenise.ts";

export type AuditRow = {
  file: string;
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  tokens: number;
  bytes: number;
};

export type FileAudit = {
  file: string;
  totalTokens: number;
  totalBytes: number;
  rows: AuditRow[];
};

export function auditFile(file: string, src: string, sections: Section[]): FileAudit {
  const rows: AuditRow[] = sections.map((s) => ({
    file,
    title: s.title,
    level: s.level,
    startLine: s.startLine,
    endLine: s.endLine,
    tokens: countTokens(s.body),
    bytes: new TextEncoder().encode(s.body).length,
  }));

  return {
    file,
    totalTokens: rows.reduce((a, r) => a + r.tokens, 0),
    totalBytes: rows.reduce((a, r) => a + r.bytes, 0),
    rows,
  };
}

type TableOpts = {
  topN?: number;
  showAll?: boolean;
  color?: boolean;
};

const COLOR = {
  dim: (s: string, on: boolean) => (on ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string, on: boolean) => (on ? `\x1b[1m${s}\x1b[0m` : s),
  red: (s: string, on: boolean) => (on ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string, on: boolean) => (on ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s: string, on: boolean) => (on ? `\x1b[32m${s}\x1b[0m` : s),
};

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}
function padLeft(s: string, n: number): string {
  if (s.length >= n) return s.slice(-n);
  return " ".repeat(n - s.length) + s;
}

function tier(pct: number, color: boolean): string {
  if (pct >= 20) return COLOR.red("HEAVY ", color);
  if (pct >= 10) return COLOR.yellow("HEFTY ", color);
  if (pct >= 5) return COLOR.yellow("NOTABL", color);
  return COLOR.green("OK    ", color);
}

export function formatAudit(audit: FileAudit, opts: TableOpts = {}): string {
  const color = opts.color ?? (process.stdout.isTTY ?? false);
  const topN = opts.topN ?? 10;
  const showAll = opts.showAll ?? false;

  const rows = [...audit.rows].sort((a, b) => b.tokens - a.tokens);
  const display = showAll ? rows : rows.slice(0, topN);

  const lines: string[] = [];
  lines.push(
    COLOR.bold(`\n${audit.file}`, color) +
      COLOR.dim(
        `  ·  ${audit.totalTokens.toLocaleString()} tokens  ·  ${audit.totalBytes.toLocaleString()} bytes  ·  ${audit.rows.length} sections`,
        color,
      ),
  );

  const header =
    "  " +
    pad("TIER  ", 7) +
    padLeft("TOKENS", 8) +
    "  " +
    padLeft("%", 6) +
    "  " +
    padLeft("LINES", 12) +
    "  " +
    "SECTION";
  lines.push(COLOR.dim(header, color));

  for (const r of display) {
    const pct = audit.totalTokens === 0 ? 0 : (r.tokens / audit.totalTokens) * 100;
    const indent = "  ".repeat(Math.max(0, r.level - 1));
    const title = r.level === 0 ? "<preamble>" : `${"#".repeat(r.level)} ${r.title}`;
    lines.push(
      "  " +
        tier(pct, color) +
        " " +
        padLeft(r.tokens.toLocaleString(), 8) +
        "  " +
        padLeft(pct.toFixed(1) + "%", 6) +
        "  " +
        padLeft(`${r.startLine}-${r.endLine}`, 12) +
        "  " +
        indent +
        title,
    );
  }

  if (!showAll && rows.length > topN) {
    const rest = rows.slice(topN);
    const restTokens = rest.reduce((a, r) => a + r.tokens, 0);
    const restPct = audit.totalTokens === 0 ? 0 : (restTokens / audit.totalTokens) * 100;
    lines.push(
      COLOR.dim(
        `  … ${rest.length} smaller sections (${restTokens.toLocaleString()} tokens, ${restPct.toFixed(1)}%). Pass --all to see them.`,
        color,
      ),
    );
  }

  lines.push(suggestions(audit, color));
  return lines.join("\n");
}

function suggestions(audit: FileAudit, color: boolean): string {
  const heavy = audit.rows.filter(
    (r) => audit.totalTokens > 0 && r.tokens / audit.totalTokens >= 0.1,
  );
  if (heavy.length === 0) {
    return "\n" + COLOR.dim("  No section exceeds 10% of the file. Looks lean.", color);
  }
  const lines: string[] = ["\n" + COLOR.bold("  Shrink targets:", color)];
  for (const r of heavy) {
    const title = r.level === 0 ? "<preamble>" : r.title;
    lines.push(
      `    · ${title}  (${r.tokens.toLocaleString()} tokens, lines ${r.startLine}-${r.endLine}) — consider condensing into ${Math.max(30, Math.round(r.tokens * 0.2)).toLocaleString()}-token bullet summary.`,
    );
  }
  return lines.join("\n");
}
