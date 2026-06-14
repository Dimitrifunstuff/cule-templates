// Regenerates index.json from the template folders.
//
// Each template lives in its own folder with a template.json. This script
// scans every such folder, pulls in the risk info from the extension
// manifest (if any), and writes a single index.json the website + the app
// can fetch in one request — no GitHub directory crawling needed.
//
// Run after adding or changing a template:
//   node build-index.mjs
//
// Adding a template = create <id>/ with template.json + mode.json
// (+ optional extensions/ and preview.png), then run this.

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const templates = [];
for (const name of readdirSync(root).sort()) {
  const dir = join(root, name);
  if (name.startsWith('.') || !statSync(dir).isDirectory()) continue;
  const metaPath = join(dir, 'template.json');
  if (!existsSync(metaPath)) continue; // a folder without template.json is not a template

  const meta = readJson(metaPath);

  // Risk info, derived from the extension manifest exactly like the app's
  // install warning does — so the site can show the same badges.
  let permissions = [];
  let hasContentScript = false;
  let hasChromeCode = false;
  const manifestPath = join(dir, 'extensions', 'manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const m = readJson(manifestPath);
      if (Array.isArray(m.permissions)) permissions = m.permissions;
      hasContentScript = !!(m.content && m.content.js);
      hasChromeCode = !!(m.browser && m.browser.js);
    } catch { /* malformed manifest — leave defaults */ }
  }

  templates.push({
    id: name,
    name: meta.name || name,
    description: meta.description || '',
    author: meta.author || 'Cule',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    path: name,
    preview: existsSync(join(dir, 'preview.png')) ? `${name}/preview.png` : null,
    permissions,
    hasContentScript,
    hasChromeCode
  });
}

const index = {
  version: 1,
  updated: new Date().toISOString().slice(0, 10),
  templates
};

writeFileSync(join(root, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`Wrote index.json with ${templates.length} template(s): ${templates.map((t) => t.id).join(', ')}`);
