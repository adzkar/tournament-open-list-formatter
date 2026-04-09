/**  Copy given text to clipboard */
export function copyToClipboard(text: string): void {
  // Try modern Clipboard API first; fallback for Safari/iOS when blocked or unavailable.
  void (async () => {
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        window.alert("text berhasil tersalin!");
        return;
      }
    } catch {
      // Ignore and try legacy path below
    }

    // Legacy fallback: hidden textarea + document.execCommand('copy')
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; // prevent scroll jumps on iOS
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);

      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length); // iOS requires explicit range

      const ok = document.execCommand("copy");
      document.body.removeChild(ta);

      if (ok) {
        window.alert("text berhasil tersalin!");
        return;
      }
      throw new Error("execCommand copy failed");
    } catch {
      window.alert(
        "Gagal menyalin. Silakan pilih teks dan salin secara manual.",
      );
    }
  })();
}

/**  Paste text from clipboard */
export function pasteFromClipboard() {
  // Prefer modern Clipboard API when available and permitted.
  // On iOS Safari/Brave, readText may be unavailable or require a direct user gesture.
  return (async () => {
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.readText === "function"
      ) {
        const text = await navigator.clipboard.readText();
        window.alert("text berhasil ditempel!");
        return text;
      }
    } catch {
      // fall through to manual paste overlay below
    }
  })();
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

export type Participant = {
  original: string;
  hasCheck: boolean;
  hasAcc: boolean;
  hasMoney: boolean;
  hasVideo: boolean;
  hasStar: boolean;
  isPartnerPlaceholder: boolean;
  leftName?: string;
  rightName?: string;
  community?: string;
  notFullPaid?: boolean;
  eventCode?: string; // Generic field for any event code (GC21, GP22, etc.)
};

function parseParticipantContent(content: string): Participant {
  const c = content.trim();
  const notFullPaid = /100K/.test(c);
  const hasCheck = /✅/.test(c);
  const hasAcc = /💯/.test(c);
  const hasMoney = /💰/.test(c);
  const hasVideo = /🎥/.test(c);
  const hasStar = /\*/.test(c);
  const isPartnerPlaceholder =
    /\b\/\s*partner\b/i.test(c) || /\bpartner\b\s*\/?$/i.test(c);

  // Extract any event code pattern (GC21, GP22, GW11, etc.)
  const eventCodeMatch = c.match(/^```([A-Z]{2}\d{2})```\s+/);
  const eventCode = eventCodeMatch ? eventCodeMatch[1] : undefined;

  // Remove event code, markers and trailing star-notes for parsing names/community
  const stripped = c
    .replace(/^```[A-Z]{2}\d{2}```\s+/, "") // Remove any event code prefix
    .replace(/[💯💰✅🎥]/gu, "")
    .replace(/\*.*$/, "")
    .trim();

  // Try to extract names and optional community in parentheses
  const m = stripped.match(/^(.+?)\s*\/\s*(.+?)(?:\s*\(([^)]+)\))?\s*$/);

  const leftName = m ? m[1].trim() : undefined;
  const rightName = m ? m[2].trim() : undefined;
  const community = m ? (m[3] ? m[3].trim() : undefined) : undefined;

  return {
    original: c,
    notFullPaid,
    hasCheck,
    hasAcc,
    hasVideo,
    hasStar,
    hasMoney,
    isPartnerPlaceholder,
    leftName,
    rightName,
    community,
    eventCode, // Add the new field
  };
}

function participantPriority(p: Participant): number {
  // Sorting buckets (ascending = higher priority):
  // 0: ✅💰 not-full-paid
  // 1: ✅💰
  // 2: ✅
  // 3: 🎥
  // 4: others
  // 5: "/partner" placeholder lines
  // 6: entries with '*' comments
  if (p.hasCheck && p.hasMoney && p.notFullPaid) return 0;
  if (p.hasCheck && p.hasMoney) return 1;
  if (p.hasCheck) return 2;
  if (p.hasVideo) return 3;
  if (!p.isPartnerPlaceholder && !p.hasStar) return 4; // others
  if (p.isPartnerPlaceholder) return 5;
  return 6; // starred entries
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

  // Build community counts (normalized, case-insensitive) to sort by frequency desc
  const communityKeyNorm = (p: Participant) =>
    (p.community || "").trim().toLowerCase();

  const communityCounts = new Map<string, number>();
  for (const e of entries) {
    const key = communityKeyNorm(e.p);
    communityCounts.set(key, (communityCounts.get(key) || 0) + 1);
  }

  entries.sort((a, b) => {
    // Primary: group by eventCode alphabetically. Entries without a code sort last.
    const ca = a.p.eventCode ?? "\uFFFF";
    const cb = b.p.eventCode ?? "\uFFFF";
    if (ca !== cb) return ca < cb ? -1 : 1;

    // Secondary: existing priority tiers within the same code group
    const pa = participantPriority(a.p);
    const pb = participantPriority(b.p);
    if (pa !== pb) return pa - pb;

    // Inside the top priority bucket: starred ones go to the very top
    if (pa === 0) {
      if (a.p.hasStar !== b.p.hasStar) return a.p.hasStar ? -1 : 1;
    }

    // Sort by community frequency (desc). Empty community goes last.
    const ka = communityKeyNorm(a.p);
    const kb = communityKeyNorm(b.p);

    const aEmpty = ka.length === 0;
    const bEmpty = kb.length === 0;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

    const commA = communityCounts.get(ka) || 0;
    const commB = communityCounts.get(kb) || 0;
    if (commA !== commB) return commB - commA; // higher frequency first

    // Tie-breaker: community name A–Z (empty already handled)
    if (ka !== kb) return ka < kb ? -1 : 1;

    // stable within the same bucket and community: preserve original order
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
