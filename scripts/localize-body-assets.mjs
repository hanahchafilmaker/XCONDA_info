#!/usr/bin/env node
// Copy uploaded public-page blocks using fresh Notion API URLs. Never commit credentials or signed URLs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'assets/notion-files';
const LIMIT = 20 * 1024 * 1024;
const TYPES = new Set(['image', 'file', 'pdf', 'video']);
const text = v => Array.isArray(v) ? v.map(x => Array.isArray(x) ? String(x[0] ?? '') : '').join('') : '';
const blockOf = e => e?.value?.value ?? e?.value;
const undash = id => String(id ?? '').replace(/-/g, '').toLowerCase();

export async function localizeBodyAssets(snapshot, { root = ROOT, token = process.env.NOTION_TOKEN, siteUrl = process.env.SITE_URL || 'https://hub.xconda.ai/', fetcher = fetch, log = console.warn } = {}) {
  const dir = path.join(root, DIR);
  const manifestFile = path.join(dir, 'manifest.json');
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch {}
  const warnings = [], pending = [];
  const warn = msg => { warnings.push(msg); log(`⚠️ [본문 첨부] ${msg}`); };
  const base = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
  if (base.protocol !== 'https:') throw new Error('SITE_URL must use HTTPS');
  for (const row of snapshot.rows ?? []) {
    const page = snapshot.pages?.[row.id];
    if (!page || row.Published === false) continue;
    const map = new Map(Object.values(page).map(blockOf).filter(Boolean).map(b => [undash(b.id), b]));
    const rootBlock = map.get(undash(row.id));
    const visited = new Set();
    const walk = id => {
      const key = undash(id), b = map.get(key);
      if (!b || visited.has(key)) return;
      visited.add(key);
      if (TYPES.has(b.type)) {
        const raw = text(b.properties?.source) || b.format?.display_source || '';
        delete b.__localAsset;
        if (/^attachment:/i.test(raw) || /(?:notion-static\.com|prod-files-secure|file\.notion\.so)/i.test(raw)) {
          const sourceKey = crypto.createHash('sha256').update(`${b.id}\n${raw}`).digest('hex');
          const existing = manifest[sourceKey];
          if (typeof existing === 'string' && /^[a-f0-9]{64}\.[a-z0-9]{1,8}$/.test(existing) && fs.existsSync(path.join(dir, existing))) {
            b.__localAsset = new URL(`${DIR}/${existing}`, base).href;
          } else pending.push({ b, row, raw, sourceKey });
        }
      }
      for (const child of b.content ?? []) walk(child);
    };
    walk(rootBlock?.id);
  }
  let next = 0, copied = 0;
  async function worker() {
    while (next < pending.length) {
      const { b, row, raw, sourceKey } = pending[next++];
      if (!token) { warn(`${row.Title || row.id} / ${b.id}: NOTION_TOKEN 없음`); continue; }
      try {
        const meta = await fetcher(`https://api.notion.com/v1/blocks/${encodeURIComponent(b.id)}`, { headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' }, signal: AbortSignal.timeout(15000) });
        if (!meta.ok) throw new Error(`Notion API HTTP ${meta.status}`);
        const data = await meta.json();
        const part = data?.[b.type];
        if (part?.type !== 'file' || !part.file?.url) throw new Error('업로드 파일 URL 없음 또는 외부 파일');
        const remote = new URL(part.file.url);
        if (remote.protocol !== 'https:') throw new Error('HTTPS URL 아님');
        const res = await fetcher(remote.href, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`파일 HTTP ${res.status}`);
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (/text\/html|application\/json/.test(ct)) throw new Error('파일 대신 오류 문서가 반환됨');
        if (Number(res.headers.get('content-length')) > LIMIT) throw new Error('20MB 제한 초과');
        const bytes = Buffer.from(await res.arrayBuffer());
        if (!bytes.length || bytes.length > LIMIT) throw new Error('빈 파일 또는 20MB 제한 초과');
        const name = text(b.properties?.title) || raw.split(':').pop() || '';
        const extMatch = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
        const ext = extMatch?.[1] || ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf', 'video/mp4': 'mp4' }[ct.split(';')[0]]) || 'bin';
        // Never publish active content on the hub origin.
        if (['html','htm','svg','js','mjs','php','xml'].includes(ext)) throw new Error('활성 콘텐츠 형식은 복사하지 않음');
        const file = `${crypto.createHash('sha256').update(bytes).digest('hex')}.${ext}`;
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, file), bytes);
        manifest[sourceKey] = file;
        b.__localAsset = new URL(`${DIR}/${file}`, base).href;
        copied++;
      } catch (e) { warn(`${row.Title || row.id} / ${b.id}: ${e.message}`); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
  if (Object.keys(manifest).length) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(manifestFile, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`);
  }
  return { copied, warnings };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.resolve(process.argv[2] || 'notion-content.json');
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = await localizeBodyAssets(snapshot);
  fs.writeFileSync(file, `${JSON.stringify(snapshot)}\n`);
  console.log(`본문 첨부 복사 ${result.copied}건, 경고 ${result.warnings.length}건`);
}
