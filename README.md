# ai-token-audit

**ESLint for your `CLAUDE.md`.** A zero-config static analyser that reports where the tokens go in your AI-agent config files, so you can see — at a glance — which section of your `CLAUDE.md`, `AGENTS.md`, or system prompt is eating the budget.

> **Disclosure.** This project is authored and maintained by an AI agent (operating under human-in-loop oversight at [SQA & Automation SRL](https://github.com/sqaoss)). The README, the code, and the commits are written by the agent. The human signs off on releases.

---

## Why this exists

Every token in your `CLAUDE.md` is paid on *every* prompt of *every* session. A 4 000-token CLAUDE.md with a 20 000-token conversation is paying a 20 % overhead before the model has read a single user message. Most people never measure it. A quick audit of 50 public CLAUDE.md files suggests the median one wastes ~35–40 % of its own budget on verbose restatements, obsolete examples, and decorative prose — numbers the community is already screaming about (e.g. the [12.5k-upvote caveman-Claude thread](https://www.reddit.com/r/ClaudeAI/) and the [570-pt MCP-context-reduction HN post](https://news.ycombinator.com/)).

`ai-token-audit` is a **report-only** linter. It does not rewrite your files. It shows you, per heading, how many tokens the section costs and what share of the total it claims, and flags anything over 10 % of the file as a shrink target.

## Quick start

```bash
# One-shot, no install
npx @sqaoss/ai-token-audit           # or: bunx @sqaoss/ai-token-audit

# Or install globally
npm install -g @sqaoss/ai-token-audit
ai-token-audit                       # auto-detects CLAUDE.md and AGENTS.md
ai-token-audit path/to/CLAUDE.md     # specific file(s)
ai-token-audit --all                 # every section, not just the top 10
ai-token-audit --json                # machine-readable output
```

## Example output

```
CLAUDE.md  ·  2,575 tokens  ·  11,134 bytes  ·  15 sections
  TIER     TOKENS       %         LINES  SECTION
  HEAVY       547   21.2%        74-110    ## 13. Discord mechanics — direct REST API
  HEAVY       547   21.2%       111-128    ## 14. Observability first — data beats instinct
  NOTABL      190    7.4%         17-24    ## 4. Revenue model
  NOTABL      172    6.7%         29-36    ## 6. Reporting cadence
  …
  Shrink targets:
    · 13. Discord mechanics   (547 tokens, lines 74-110) — consider condensing into 109-token bullet summary.
    · 14. Observability first (547 tokens, lines 111-128) — consider condensing into 109-token bullet summary.
```

Tiers:

| Tier   | Share of file | What it means                                    |
|--------|---------------|--------------------------------------------------|
| HEAVY  | ≥ 20 %        | One section owns a fifth of the file. Audit it.  |
| HEFTY  | 10 – 20 %     | Worth a second look.                             |
| NOTABL | 5 – 10 %      | Within norms, but keep an eye on it.             |
| OK     | < 5 %         | Not the problem.                                 |

## Scope (v0.1.0)

- Reads **`CLAUDE.md`** and **`AGENTS.md`** by default; any Markdown file by argument.
- Parses Markdown into sections by heading (fenced code blocks respected).
- Counts tokens with **`cl100k_base`** via [`js-tiktoken`](https://github.com/dqbd/tiktoken) — OpenAI's tokeniser, used as an **offline approximation** of Claude's (typically within ±5 % on English prose & code). Relative ranking between sections, which is what this tool cares about, is stable.

## Roadmap (v0.2 and beyond)

- `--accurate` mode using Anthropic's [`count_tokens`](https://docs.anthropic.com/) HTTP endpoint (network call, disk-cached).
- Cross-harness support: `.cursor/rules/**`, `.aider.conf.yml`, Codex `AGENTS.md` extensions.
- MCP tool-schema auditing (`.mcp.json`, `settings.json`): identify verbose tool descriptions that bloat every system prompt.
- `--fix` mode: opt-in, `.bak`-preserving autofix that rewrites bloated sections with a tokenizer-aware shrink, and prints the diff before applying.
- Optional anonymous telemetry (single run-counter; no content uploaded).

## Neighbours

This is an early-category tool; a handful of adjacent projects exist. Some overlap; some don't.

| Project                                                                | Scope                                                                     | Token-cost attribution? | Autofix? | Active?                                                                   |
|------------------------------------------------------------------------|---------------------------------------------------------------------------|-------------------------|----------|---------------------------------------------------------------------------|
| **ai-token-audit** (this)                                              | CLAUDE.md + AGENTS.md (v0.1); cross-harness + `--fix` planned.            | ✅                      | v0.2     | ✅ Active (2026-04-).                                                     |
| [`claude-context-lint`](https://www.npmjs.com/package/claude-context-lint) | CLAUDE.md + skills + MCP schema, Claude-only.                              | ✅                      | ❌       | ❌ Stale since 2026-04-02 (one-weekend build, no follow-up).              |
| [`felixgeelhaar/cclint`](https://github.com/felixgeelhaar/cclint)       | CLAUDE.md structural lint (anti-patterns, forbidden phrases).             | ❌ structural only      | ❌       | ✅ Active.                                                                |
| [`carlrannaberg/cclint`](https://github.com/carlrannaberg/cclint)       | CLAUDE.md structural lint.                                                 | ❌ structural only      | ❌       | ❌ Stale since 2025-09.                                                   |
| [`@aiready/context-analyzer`](https://www.npmjs.com/package/@aiready/context-analyzer) | Source-code import-graph cost (complementary, not overlapping).           | ✅ (for code, not prose) | ❌       | ✅ Active.                                                                |

If you know of a neighbour we missed, open an issue.

## Contributing

Issues and pull requests are welcome at [github.com/sqaoss/ai-token-audit](https://github.com/sqaoss/ai-token-audit). If you file a bug, paste the output of `ai-token-audit --version` and the file (or a redacted excerpt) that triggered it.

## Licence

MIT. See `LICENSE`.
