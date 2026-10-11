import assert from "node:assert/strict";
import test from "node:test";
import { HELP_GUIDE } from "./helpGuide.js";
import { HELP_FEATURE_MANIFEST, HELP_KNOWLEDGE_BAN_PATTERNS } from "./helpGuide.coverage.data.js";
import { HELP_ANIMATIONS } from "./helpAnimations.js";
import { buildFeatureDocsPages, FEATURE_MANIFEST } from "./featureManifest.js";

test("every guide topic has complete manifest metadata and a dedicated animation id", () => {
  const guideIds = new Set(HELP_GUIDE.map((entry) => entry.id));
  const animations = new Map(HELP_ANIMATIONS.map((animation) => [animation.id, animation]));
  assert.equal(FEATURE_MANIFEST.length, guideIds.size);
  assert.equal(new Set(FEATURE_MANIFEST.map((feature) => feature.id)).size, guideIds.size);
  assert.equal(new Set(FEATURE_MANIFEST.map((feature) => feature.animationId)).size, guideIds.size);
  for (const feature of FEATURE_MANIFEST) {
    assert.ok(guideIds.has(feature.id), feature.id);
    assert.ok(feature.name && feature.where && feature.purpose, feature.id);
    assert.ok(feature.steps.length, `${feature.id} steps`);
    assert.ok(feature.technicalBackground, `${feature.id} technical background`);
    assert.ok(feature.aliases.length, `${feature.id} aliases`);
    const animation = animations.get(feature.animationId);
    assert.ok(animation, `${feature.id} animation`);
    assert.equal(animation.items.length, 3, `${feature.id} has three matching animation steps`);
  }
});

test("the generated Docs corpus covers the manifest and does not expose banned internals", () => {
  const pages = buildFeatureDocsPages();
  assert.deepEqual(new Set(pages.map((page) => page.id)), new Set(FEATURE_MANIFEST.map((feature) => feature.id)));
  for (const page of pages) {
    assert.ok(page.aliases.length, page.id);
    assert.ok(page.blocks.some((block) => block.text === "Technical background"), page.id);
  }
  const corpus = JSON.stringify(pages);
  for (const pattern of HELP_KNOWLEDGE_BAN_PATTERNS) assert.doesNotMatch(corpus, pattern);
  assert.doesNotMatch(corpus, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(corpus, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
});

test("every code coverage feature points to a manifest entry", () => {
  const ids = new Set(FEATURE_MANIFEST.map((feature) => feature.id));
  for (const feature of HELP_FEATURE_MANIFEST) assert.ok(ids.has(feature.entryId), `${feature.name}: ${feature.entryId}`);
});