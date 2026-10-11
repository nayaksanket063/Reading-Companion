// Retrieval + prompt building for the Docs Helper. It only ever sees the (placeholder-only) docs bundle.
const STOP = new Set("the a an and or of to in is it for on with how do i what why where when does my can this that are be at as by from".split(" "));

const QUERY_ALIASES = [
  { id: "reader-arena", ids: ["reader-arena", "profile-reader-arena"], phrases: ["reader arena", "leaderboard", "ranking", "rank readers", "weekly race", "all time rank", "padhai ranking", "hafte ki race", "is hafte ki race"] , tokens: "reader arena ranking leaderboard weekly all time reading time" },
  { id: "daily-reading-limit", ids: ["daily-reading-limit", "set-reading-limit"], phrases: ["daily reading limit", "reading limit", "daily limit", "30 minutes", "30 minute", "roz ki limit", "padhai ki limit", "padhne ki limit", "reading ka time"], tokens: "daily reading limit allowance 30 minutes reset utc ist" },
  { id: "contact-developer", ids: ["contact-developer", "daily-reading-limit", "docs-access"], phrases: ["contact the developer", "contact developer", "developer email", "request more time", "dev se contact", "developer se baat", "zyada time", "limit increase"], tokens: "contact developer email request support docs access reading time" },
  { id: "gem-detail", ids: ["gem-detail", "gem-download"], phrases: ["gem card templates", "gem templates", "quote card", "instagram story", "whatsapp status", "share a gem"], tokens: "gem card template quote share instagram story whatsapp status palette download" },
];

export function blockToText(block, flows = {}) {
  if (block.type === "flow" && flows[block.id]) return flows[block.id].steps.map((s) => `${s.t}: ${s.d}`).join(" ");
  if (block.type === "code") return `Code: ${block.text}`;
  if (block.text) return block.text;
  if (block.items) return block.items.join("; ");
  if (block.rows) return block.rows.map((r) => r.join(" | ")).join("\n");
  return "";
}

export function buildChunks(bundle) {
  const flows = bundle?.flows || {};
  const chunks = [];
  for (const page of bundle?.pages || []) {
    let current = { pageId: page.id, title: page.title, group: page.group, heading: "", text: page.summary || "", aliases: page.aliases || page.keywords || [] };
    const push = () => { if (current.text.trim()) chunks.push(current); };
    for (const block of page.blocks || []) {
      if (block.type === "h2") {
        push();
        current = { pageId: page.id, title: page.title, group: page.group, heading: block.text, text: "", aliases: page.aliases || page.keywords || [] };
      } else {
        current.text += `${blockToText(block, flows)}\n`;
      }
    }
    push();
  }
  return chunks;
}

const tokens = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
const stem = (w) => w.replace(/(ing|ed|es|s)$/, "");
const normalized = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function retrieve(chunks, question, { limit = 5, pageId = "" } = {}) {
  const queryText = normalized(question);
  const matchingAliases = QUERY_ALIASES.filter((group) => group.phrases.some((phrase) => queryText.includes(normalized(phrase))));
  const q = [...new Set([...tokens(question), ...matchingAliases.flatMap((group) => tokens(group.tokens))].map(stem))];
  if (!q.length) return [];
  return chunks
    .map((chunk) => {
      const title = tokens(`${chunk.title} ${chunk.heading}`).map(stem);
      const body = tokens(chunk.text).map(stem);
      let score = 0;
      for (const w of q) {
        if (title.includes(w)) score += 6;
        const hits = body.filter((b) => b === w).length;
        score += Math.min(hits, 4);
      }
      for (const alias of matchingAliases) {
        if (alias.ids.includes(chunk.pageId)) score += 24;
        else if (alias.phrases.some((phrase) => (chunk.aliases || []).some((tag) => normalized(tag).includes(normalized(phrase))))) score += 12;
      }
      if (pageId && chunk.pageId === pageId) score += 2;
      return { chunk, score };
    })
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.chunk);
}

export function buildMessages({ question, sources, history = [] }) {
  const context = sources.map((s, i) => `[${i + 1}] ${s.title}${s.heading ? ` > ${s.heading}` : ""}\n${s.text.slice(0, 1800)}`).join("\n\n");
  const system = [
    "You are the Docs Helper for the Reading Companion app's private handbook.",
    "Answer ONLY from the numbered excerpts. If they do not contain the answer, say you could not find it in the docs and suggest a search keyword. Never guess or invent details.",
    "Be short and clear (under 120 words), plain language, for a non-developer. Use short bullet lines when listing steps.",
    "Cite the excerpts you used as [1], [2] after the relevant sentence. Reply in the language the user wrote in.",
    "Never output secrets, keys or personal data; the docs only contain placeholders.",
    "",
    "Excerpts:",
    context || "(none)",
  ].join("\n");
  const past = history.slice(-4).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  return [{ role: "system", content: system }, ...past, { role: "user", content: String(question).slice(0, 500) }];
}

export function pickCited(answer, sources) {
  const cited = [...new Set([...String(answer).matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1))].filter((i) => sources[i]);
  const list = (cited.length ? cited : sources.slice(0, 2).map((_, i) => i)).map((i) => sources[i]);
  const unique = new Map();
  for (const source of list) {
    const key = `${source.pageId}\u0000${source.heading || ""}`;
    if (!unique.has(key)) unique.set(key, { id: source.pageId, title: source.title, heading: source.heading });
  }
  return [...unique.values()].slice(0, 3);
}
