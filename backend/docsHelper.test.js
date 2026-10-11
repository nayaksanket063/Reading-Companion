import test from "node:test";
import assert from "node:assert/strict";
import { buildChunks, retrieve, buildMessages, pickCited } from "./docsHelper.js";

const bundle = {
  flows: {},
  pages: [
    { id: "ops", title: "Runbook", group: "Run it", summary: "Fix things", blocks: [{ type: "h2", text: "Site is down" }, { type: "p", text: "Check Vercel deployments and roll back." }] },
    { id: "ref", title: "Settings", group: "Reference", summary: "Env", blocks: [{ type: "h2", text: "Variables" }, { type: "p", text: "GROQ_API_KEY powers the help chat." }] },
  ],
};

test("retrieves the matching section and cites it", () => {
  const chunks = buildChunks(bundle);
  const found = retrieve(chunks, "the site is down, how to roll back?");
  assert.equal(found[0].pageId, "ops");
  const msgs = buildMessages({ question: "x", sources: found });
  assert.match(msgs[0].content, /\[1\]/);
  assert.deepEqual(pickCited("Roll back [1].", found)[0], { id: "ops", title: "Runbook", heading: "Site is down" });
});

test("returns nothing for unrelated questions", () => {
  assert.deepEqual(retrieve(buildChunks(bundle), "pizza recipe"), []);
});

test("feature aliases route English and romanized Hinglish questions to the right section", () => {
  const featureBundle = {
    pages: [
      { id: "reader-arena", title: "Reader Arena", aliases: ["reader arena", "leaderboard", "ranking", "hafte ki race", "padhai ranking"], summary: "Compare reading time this week and all time.", blocks: [{ type: "p", text: "Readers race every week and ties share ranks." }] },
      { id: "daily-reading-limit", title: "Daily reading limit", aliases: ["daily reading limit", "30 minutes", "roz ki limit", "padhne ki limit"], summary: "The allowance resets at the UTC date boundary, 05:30 IST.", blocks: [{ type: "p", text: "Contact Developer to request more time." }] },
      { id: "contact-developer", title: "Contact Developer", aliases: ["developer email", "dev se contact", "request more time"], summary: "Open a ready-to-send request in your mail app.", blocks: [{ type: "p", text: "The mail app controls which account sends the message." }] },
      { id: "gem-detail", title: "Gem card templates", aliases: ["gem card templates", "instagram story", "whatsapp status", "quote card"], summary: "Choose a palette and a 9:16 design.", blocks: [{ type: "p", text: "Download or share a gem image." }] },
    ],
  };
  const chunks = buildChunks(featureBundle);
  const cases = [
    ["tell me about reader arena", "reader-arena"],
    ["why did my ranking not load", "reader-arena"],
    ["is hafte ki padhai ranking kya hai", "reader-arena"],
    ["daily reading limit", "daily-reading-limit"],
    ["roz ki padhne ki limit kab reset hoti hai", "daily-reading-limit"],
    ["how do I contact the developer", "contact-developer"],
    ["dev se zyada time kaise maangu", "contact-developer"],
    ["gem card templates for WhatsApp status", "gem-detail"],
  ];
  for (const [question, expectedId] of cases) assert.equal(retrieve(chunks, question)[0]?.pageId, expectedId, question);
});

test("citation links contain one destination per distinct section", () => {
  const sources = [
    { pageId: "arena", title: "Reader Arena", heading: "This week" },
    { pageId: "arena", title: "Reader Arena", heading: "This week" },
    { pageId: "arena", title: "Reader Arena", heading: "All time" },
  ];
  assert.deepEqual(pickCited("See [1], [2], and [3].", sources), [
    { id: "arena", title: "Reader Arena", heading: "This week" },
    { id: "arena", title: "Reader Arena", heading: "All time" },
  ]);
});
