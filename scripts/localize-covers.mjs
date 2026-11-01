#!/usr/bin/env node
// Copy publicly accessible Notion Cover properties to the hub during snapshot publishing.
// Keep source URLs as fallback; inaccessible files never prevent the snapshot from publishing.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { COVER_KEYS, signNotionImage } from "../src/content/fields.js";
import { fileUrlOf, pickProp } from "../src/content/seo.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = "assets/img/covers";
const MANIFEST = `${DIR}/manifest.json`;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 8 * 1024 * 1024;

export async function localizeCovers(snapshot, { root = ROOT, fetcher = fetch, log = console.log } = {}) {
  const dir = path.join(root, DIR);
  fs.mkdirSync(dir, { recursive: true });
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(path.join(root, MANIFEST), "utf8")); } catch { /* first run */ }
  let saved = 0, failed = 0, cached = 0;
  const rows = snapshot.rows ?? [];
  let next = 0;
  async function processRow(row) {
    delete row.__coverLocal;
    const property = pickProp(row, COVER_KEYS);
    const original = fileUrlOf(property);
    if (!original || !row.id) return;
    const url = signNotionImage(original, row.id);
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch { return; }
    // Only Notion-owned hosts; do not fetch arbitrary user-provided addresses.
    if (!/(^|\.)(notion\.so|notion\.site|notion\.com|notion-static\.com|amazonaws\.com)$/.test(host)) return;
    const key = createHash("sha256").update(url).digest("hex");
    const existing = manifest[key];
    if (typeof existing === "string" && /^[a-f0-9]{64}\.(jpg|png|webp|gif)$/.test(existing) && fs.existsSync(path.join(dir, existing))) {
      row.__coverLocal = `${DIR}/${existing}`;
      cached++;
      return;
    }
    try {
      const raw = Array.isArray(property) && typeof property[0] === "object" ? property[0]?.rawUrl : original;
      const candidates = [...new Set([url, raw].filter((item) => {
        try { const u = new URL(item); return u.protocol === "https:" && /(^|\.)(notion\.so|notion\.site|notion\.com|notion-static\.com|amazonaws\.com)$/.test(u.hostname); } catch { return false; }
      }))];
      let res;
      let lastError;
      for (const candidate of candidates) {
        try {
          const response = await fetcher(candidate, { signal: AbortSignal.timeout(10000), headers: { "user-agent": "XCONDA-Hub-Cover/1.0" } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (!TYPES[(response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()]) throw new Error("not an image");
          res = response;
          break;
        } catch (error) { lastError = error; }
      }
      if (!res) throw lastError ?? new Error("no usable URL");
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = TYPES[type];
      if (!ext) throw new Error(`not an image (${type || "no content type"})`);
      const length = Number(res.headers.get("content-length"));
      if (length > MAX_BYTES) throw new Error("image too large");
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length || buf.length > MAX_BYTES) throw new Error("empty or oversized image");
      const name = `${key}.${ext}`;
      fs.writeFileSync(path.join(dir, name), buf);
      manifest[key] = name;
      row.__coverLocal = `${DIR}/${name}`;
      saved++;
    } catch (error) {
      failed++;
      log(`커버 복사 실패 (${row.id}): ${error.message}`);
    }
  }
  async function worker() {
    while (next < rows.length) await processRow(rows[next++]);
  }
  await Promise.all(Array.from({ length: Math.min(5, rows.length) }, worker));
  fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`);
  log(`커버 이미지: 저장 ${saved} · 캐시 ${cached} · 실패 ${failed}`);
  return { saved, cached, failed };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.resolve(process.argv[2] || "notion-content.json");
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  await localizeCovers(snapshot);
  fs.writeFileSync(file, `${JSON.stringify(snapshot)}\n`);
}
