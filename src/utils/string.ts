/**  Copy given text to clipboard */
export function copyToClipboard(text: string): void {
  void navigator.clipboard.writeText(text).then(() => {
    window.alert("text berhasil tersalin!");
  });
}

/**  Paste text from clipboard */
export function pasteFromClipboard() {
  return navigator.clipboard.readText().then((text: string) => {
    window.alert("text berhasil ditempel!");
    return text;
  });
}

/** Split input into header, main (participant list), and footer.
 * Rules:
 * - main starts at the line containing "LIST PESERTA" (case-insensitive, emoji tolerated)
 * - main ends just before a line starting with "Note" (case-insensitive) if present,
 *   otherwise at the last numbered entry line like "84. ..."
 */
export function splitSkbTextSections(text: string): {
  header: string;
  main: string;
  footer: string;
} {
  // Normalize line endings and trim trailing spaces while keeping original content
  const normalize = (s: string) =>
    s
      // remove some zero-width/control characters that may appear from copy-paste,
      // but KEEP Zero Width Joiner (U+200D) and emoji variation selector (U+FE0F)
      // to avoid breaking emoji sequences like "🧑‍🤝‍🧑"
      .replace(/[\u200B\u200C\u200E\u200F\u202A-\u202E\u2060]/g, "")
      .replace(/\r\n?/g, "\n");

  const src = normalize(text);
  const lines = src.split("\n");

  const includesListPeserta = (line: string) => /list\s*p(es)?erta/i.test(line);
  const isNoteLine = (line: string) => /^\s*note\b/i.test(line);
  const isNumberedItem = (line: string) => /^\s*\d+\./.test(line.trim());

  // Find start of main
  let startIdx = lines.findIndex((l) => includesListPeserta(l));
  if (startIdx === -1) {
    // Fallback: try to find the first numbered list if the marker is missing
    startIdx = lines.findIndex((l) => isNumberedItem(l));
  }

  if (startIdx === -1) {
    // No recognizable main section; everything is header
    return { header: src.trim(), main: "", footer: "" };
  }

  // Find end of main
  let noteIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (isNoteLine(lines[i])) {
      noteIdx = i;
      break;
    }
  }

  let lastNumberedIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (isNumberedItem(lines[i])) lastNumberedIdx = i;
  }

  let endIdx: number;
  if (noteIdx !== -1 && noteIdx > startIdx) {
    endIdx = noteIdx - 1;
  } else if (lastNumberedIdx !== -1) {
    endIdx = lastNumberedIdx;
  } else {
    // If no numbered lines after the marker, include until before any trailing empty lines
    endIdx = Math.max(startIdx, lines.length - 1);
  }

  // Trim trailing empty lines from main end
  while (endIdx > startIdx && lines[endIdx].trim() === "") endIdx--;

  const header = lines.slice(0, startIdx).join("\n").trim();
  const main = lines
    .slice(startIdx, endIdx + 1)
    .join("\n")
    .trim();
  const footer = lines
    .slice(endIdx + 1)
    .join("\n")
    .trim();

  return { header, main, footer };
}

export type SkbParticipant = {
  original: string; // content without leading numbering
  hasCheck: boolean; // ✅
  hasAcc: boolean; // 💯
  hasVideo: boolean; // 🎥
  hasStar: boolean; // contains '*'
  isPartnerPlaceholder: boolean; // e.g., " / partner" or "/partner"
  leftName?: string;
  rightName?: string;
  community?: string;
};

function parseParticipantContent(content: string): SkbParticipant {
  const c = content.trim();
  const hasCheck = /✅/.test(c);
  const hasAcc = /💯/.test(c);
  const hasVideo = /🎥/.test(c);
  const hasStar = /\*/.test(c);
  const isPartnerPlaceholder =
    /\b\/\s*partner\b/i.test(c) || /\bpartner\b\s*\/?$/i.test(c);

  // Remove markers and trailing star-notes for parsing names/community
  const stripped = c
    .replace(/[✅💯🎥]/gu, "")
    .replace(/\*.*$/, "")
    .trim();

  // Try to extract names and optional community in parentheses
  // e.g., "Adhitriya / Aziz N (badmintul)"
  const m = stripped.match(/^(.+?)\s*\/\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/);

  const leftName = m ? m[1].trim() : undefined;
  const rightName = m ? m[2].trim() : undefined;
  const community = m ? (m[3] ? m[3].trim() : undefined) : undefined;

  return {
    original: c,
    hasCheck,
    hasAcc,
    hasVideo,
    hasStar,
    isPartnerPlaceholder,
    leftName,
    rightName,
    community,
  };
}

function participantPriority(p: SkbParticipant): number {
  // Sorting buckets as per rules:
  // 0: ✅💯
  // 1: 💯 (but not ✅)
  // 2: 🎥 (but not covered above)
  // 3: no sign
  // 4: " / partner"
  // 5: contains '*'
  if (p.hasStar) return 5;
  if (p.isPartnerPlaceholder) return 4;
  if (p.hasCheck && p.hasAcc) return 0;
  if (p.hasAcc) return 1;
  if (p.hasVideo) return 2;
  return 3;
}

/** Sort only the numbered participant lines inside the provided main section text. */
export function sortSkbMainParticipants(main: string): string {
  const lines = main.split("\n");

  // identify the first numbered item; keep anything before it (e.g., the title line)
  const isNumbered = (l: string) => /^\s*\d+\./.test(l);
  const firstNumIdx = lines.findIndex(isNumbered);
  if (firstNumIdx === -1) return main; // nothing to sort

  // collect numbered lines contiguous until the end (we already trimmed on split)
  const before = lines.slice(0, firstNumIdx);
  const numbered = lines.slice(firstNumIdx);

  // parse each numbered line => strip the leading number and dot to get content
  const entries = numbered
    .map((line) => {
      const m = line.match(/^\s*\d+\.\s*(.*)$/);
      const content = m ? m[1] : line.trim();
      return parseParticipantContent(content);
    })
    .map((p, idx) => ({ p, idx })); // keep stable index for stable sort

  entries.sort((a, b) => {
    const pa = participantPriority(a.p);
    const pb = participantPriority(b.p);
    if (pa !== pb) return pa - pb;
    // Sort by community (A-Z, empty last)
    const communityKey = (p: SkbParticipant) => {
      const c = (p.community || "").trim().toLowerCase();
      return c.length ? c : "\uFFFF";
    };
    const nameKey = (s?: string) => (s || "").trim().toLowerCase();

    const ca = communityKey(a.p);
    const cb = communityKey(b.p);
    if (ca !== cb) return ca < cb ? -1 : 1;

    // Then by left player name (A-Z)
    const la = nameKey(a.p.leftName);
    const lb = nameKey(b.p.leftName);
    if (la !== lb) return la < lb ? -1 : 1;

    // Then by right player name (A-Z)
    const ra = nameKey(a.p.rightName);
    const rb = nameKey(b.p.rightName);
    if (ra !== rb) return ra < rb ? -1 : 1;

    // stable within the same bucket: preserve original order
    return a.idx - b.idx;
  });

  const rebuilt = entries.map((e, i) => `${i + 1}. ${e.p.original}`);

  return [...before, ...rebuilt].join("\n");
}

/** High-level helper: split -> sort participants in main -> merge back */
export function processAndSortSkbText(text: string): string {
  const { header, main, footer } = splitSkbTextSections(text);
  const sortedMain = sortSkbMainParticipants(main);
  const parts = [] as string[];
  if (header.trim().length) parts.push(header.trim());
  if (sortedMain.trim().length) parts.push(sortedMain.trim());
  if (footer.trim().length) parts.push(footer.trim());
  return parts.join("\n\n");
}
