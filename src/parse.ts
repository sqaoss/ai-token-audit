// Split a markdown document into sections keyed by heading.
// Lines before the first heading are grouped under a synthetic "<preamble>".

export type Section = {
  title: string;
  level: number;      // 0 for preamble, 1..6 for H1..H6
  startLine: number;  // 1-indexed
  endLine: number;    // inclusive, 1-indexed
  body: string;       // verbatim, including the heading line itself (except preamble)
};

export function parseSections(src: string): Section[] {
  const lines = src.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  let inFence = false;
  let fenceMarker = "";

  const flush = (endLine: number) => {
    if (!current) return;
    current.endLine = endLine;
    sections.push(current);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNo = i + 1;

    // Track fenced code blocks so we do not treat `#` inside them as a heading.
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[2]!;
      } else if (line.trim().startsWith(fenceMarker[0]!)) {
        inFence = false;
        fenceMarker = "";
      }
    }

    const headingMatch = !inFence ? line.match(/^(#{1,6})\s+(.*\S)\s*$/) : null;
    if (headingMatch) {
      flush(lineNo - 1);
      current = {
        title: headingMatch[2]!.trim(),
        level: headingMatch[1]!.length,
        startLine: lineNo,
        endLine: lineNo,
        body: line,
      };
    } else {
      if (!current) {
        current = {
          title: "<preamble>",
          level: 0,
          startLine: 1,
          endLine: lineNo,
          body: line,
        };
      } else {
        current.body += "\n" + line;
      }
    }
  }

  flush(lines.length);

  // Drop an empty preamble (no content before first heading).
  return sections.filter((s) => !(s.level === 0 && s.body.trim() === ""));
}
