const FONT_LOADERS = {
  "Playfair Display": () => Promise.all([import("@fontsource/playfair-display/latin-500.css"), import("@fontsource/playfair-display/latin-ext-500.css"), import("@fontsource/playfair-display/latin-600.css"), import("@fontsource/playfair-display/latin-ext-600.css")]),
  Inter: () => Promise.all([import("@fontsource/inter/latin-400.css"), import("@fontsource/inter/latin-ext-400.css"), import("@fontsource/inter/latin-500.css"), import("@fontsource/inter/latin-ext-500.css"), import("@fontsource/inter/latin-600.css"), import("@fontsource/inter/latin-ext-600.css")]),
  Caveat: () => Promise.all([import("@fontsource/caveat/latin-500.css"), import("@fontsource/caveat/latin-ext-500.css")]),
  "Special Elite": () => Promise.all([import("@fontsource/special-elite/latin-400.css"), import("@fontsource/special-elite/latin-ext-400.css")]),
  "Space Mono": () => Promise.all([import("@fontsource/space-mono/latin-400.css"), import("@fontsource/space-mono/latin-ext-400.css")]),
  "Space Grotesk": () => Promise.all([import("@fontsource/space-grotesk/latin-500.css"), import("@fontsource/space-grotesk/latin-ext-500.css"), import("@fontsource/space-grotesk/latin-600.css"), import("@fontsource/space-grotesk/latin-ext-600.css")]),
  Anton: () => Promise.all([import("@fontsource/anton/latin-400.css"), import("@fontsource/anton/latin-ext-400.css")]),
  "Noto Sans Devanagari": () => import("@fontsource/noto-sans-devanagari/devanagari-400.css"),
};

const definitions = [
  { id: "summit", name: "Summit", description: "Photo-lit editorial quote with a gold serif mark.", supportsPhoto: true, fonts: ["Playfair Display", "Inter"], defaultAccent: "#f2c48d", load: () => import("./summit.js") },
  { id: "editorial-paper", name: "Paper Bloom", description: "A tactile paper cover with oversized editorial type.", supportsPhoto: false, fonts: ["Playfair Display", "Inter"], defaultAccent: "#9f3328", load: () => import("./editorialPaper.js") },
  { id: "neon-terminal", name: "Glitch Pop", description: "A high-voltage type treatment with a terminal pulse.", supportsPhoto: false, fonts: ["Space Mono"], defaultAccent: "#54ffc1", load: () => import("./neonTerminal.js") },
  { id: "polaroid", name: "Instant Film", description: "Your artwork in a flash-photo frame with a handwritten caption.", supportsPhoto: true, fonts: ["Caveat", "Inter"], defaultAccent: "#d5b994", load: () => import("./polaroid.js") },
  { id: "swiss-minimal", name: "Cutline", description: "A clean magazine grid, bold typography, and sharp color blocks.", supportsPhoto: false, fonts: ["Space Grotesk"], defaultAccent: "#e64a35", load: () => import("./swissMinimal.js") },
  { id: "frosted-glass", name: "Chromatic", description: "A glossy translucent frame built from your chosen palette.", supportsPhoto: false, fonts: ["Inter", "Playfair Display"], defaultAccent: "#6a62d9", load: () => import("./frostedGlass.js") },
  { id: "sunset-poster", name: "Afterglow", description: "A saturated poster gradient made for full-screen stories.", supportsPhoto: false, fonts: ["Anton", "Inter"], defaultAccent: "#ffb340", load: () => import("./sunsetPoster.js") },
  { id: "cosmic", name: "Orbit Note", description: "A deep-space field, electric accents, and a floating quote panel.", supportsPhoto: false, fonts: ["Playfair Display", "Inter"], defaultAccent: "#92a8ff", load: () => import("./cosmic.js") },
  { id: "notebook-highlight", name: "Margin Notes", description: "A modern reading journal with ruled lines and bright marks.", supportsPhoto: false, fonts: ["Caveat", "Inter"], defaultAccent: "#efc84a", load: () => import("./notebookHighlight.js") },
  { id: "cinema-frame", name: "Night Drive", description: "A cinematic artwork frame with crisp, readable subtitles.", supportsPhoto: true, fonts: ["Inter", "Playfair Display"], defaultAccent: "#e8c786", load: () => import("./cinemaFrame.js") },
  { id: "neo-brutalist", name: "Sticker Pop", description: "Punchy sticker typography, hard edges, and a playful frame.", supportsPhoto: false, fonts: ["Anton", "Inter"], defaultAccent: "#f2c84b", load: () => import("./neoBrutalist.js") },
];

const moduleCache = new Map();
const fontCache = new Map();

export const GEM_TEMPLATES = definitions.map((definition) => ({
  ...definition,
  fonts: [...new Set([...definition.fonts, "Noto Sans Devanagari"])],
  render(context, data, options) {
    return loadGemTemplate(definition.id).then((module) => module.render(context, data, options));
  },
}));

export function loadGemTemplate(templateId) {
  const definition = definitions.find((item) => item.id === templateId) || definitions[0];
  if (!moduleCache.has(definition.id)) moduleCache.set(definition.id, definition.load());
  return moduleCache.get(definition.id);
}

export async function loadGemTemplateFonts(template, sampleText = "Reading Companion हिन्दी पढ़ना") {
  await Promise.all(template.fonts.map((font) => {
    if (!fontCache.has(font)) fontCache.set(font, FONT_LOADERS[font]?.() || Promise.resolve());
    return fontCache.get(font);
  }));
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.all(template.fonts.map((font) => document.fonts.load(`${font === "Noto Sans Devanagari" || font === "Special Elite" || font === "Space Mono" || font === "Anton" ? 400 : 500} 30px "${font}"`, sampleText)));
    await document.fonts.ready;
  }
}

export function templateById(templateId) {
  return GEM_TEMPLATES.find((template) => template.id === templateId) || GEM_TEMPLATES[0];
}