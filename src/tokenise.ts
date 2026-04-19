import { getEncoding, type Tiktoken } from "js-tiktoken";

let enc: Tiktoken | null = null;

function encoder(): Tiktoken {
  if (!enc) enc = getEncoding("cl100k_base");
  return enc;
}

// Token count approximation.
//
// Uses OpenAI's cl100k_base BPE (via js-tiktoken) as an offline proxy for
// Claude's tokenizer. Anthropic does not publish a local tokenizer for
// Claude 3+; cl100k is typically within ~5% of Claude's actual count on
// English prose and code, and the RELATIVE ranking between sections — which
// is what this tool cares about — is stable. An `--accurate` mode that calls
// Anthropic's `count_tokens` HTTP endpoint is planned for v0.2.
export function countTokens(text: string): number {
  if (!text) return 0;
  return encoder().encode(text).length;
}
