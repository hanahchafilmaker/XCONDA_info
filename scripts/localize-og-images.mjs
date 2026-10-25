#!/usr/bin/env node
/* =============================================================================
 * 글별 공유 이미지(OG)를 **우리 도메인으로 복사**하는 스크립트
 * -----------------------------------------------------------------------------
 * 노션 커버는 `www.notion.so/image/...` 프록시 주소라, 서명 만료·정책 변경 시
 * 모든 글의 og:image · JSON-LD image 가 한꺼번에 깨집니다. 이 스크립트가 이미지를
 * 내려받아 `assets/img/og/posts/` 에 두고 `manifest.json` 을 갱신하면,
 * 빌드(scripts/build-seo.mjs)가 **로컬 주소를 우선** 씁니다.
 *
 *   node scripts/localize-og-images.mjs [--snapshot notion-content.json] [--force]
 *
 * · 이미 받아 둔 파일은 건너뜁니다(캐시). `--force` 로 다시 받습니다.
 * · 네트워크가 없거나 일부가 실패해도 **빌드는 계속**됩니다(실패 목록만 보고).
 * · manifest 는 키를 정렬해 써서, 같은 입력이면 같은 파일이 나옵니다(멱등).
 * ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COVER_KEYS } from "../src/content/fields.js";
import { OG_LOCAL_DIR, OG_MANIFEST_PATH, ogManifestKey, pickProp, seoEligibility, seoFieldsOf, textOf } from "../src/content/seo.js";
import { coverFromPageMap } from "../src/content/fields.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

/** content-type → 확장자 */
const EXT_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const extFromUrl = (url) => {
  const m = /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.exec(url ?? "");
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "";
};

/** 저장 파일명 — 주소 키에서 만들어 충돌·경로 문제를 막습니다. */
const fileNameFor = (key, ext) => `${key.replace(/\//g, "-")}.${ext}`;

async function fetchImage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "XCONDA-Hub-OG/1.0 (+https://hub.xconda.ai/)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXT_BY_TYPE[type] ?? extFromUrl(url) ?? "";
  if (!ext) throw new Error(`이미지 형식을 알 수 없음 (content-type: ${type || "없음"})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("빈 응답");
  if (buf.length > MAX_BYTES) throw new Error(`${(buf.length / 1024 / 1024).toFixed(1)}MB — 너무 큼`);
  return { buf, ext };
}

export async function localizeOgImages({ rows = [], pages = {}, root = REPO_ROOT, force = false, log = console.log } = {}) {
  const dir = path.join(root, OG_LOCAL_DIR);
  const manifestAbs = path.join(root, OG_MANIFEST_PATH);
  fs.mkdirSync(dir, { recursive: true });

  let manifest = {};
  try {
    if (fs.existsSync(manifestAbs)) manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8")) ?? {};
  } catch {
    manifest = {};
  }

  const skipped = [];
  const failed = [];
  const saved = [];

  for (const row of rows) {
    const type = row.__type;
    const slug = textOf(pickProp(row, ["Slug"]));
    if (!type || !slug) continue;
    if (!seoEligibility(row, type).eligible) continue; // 주소가 없는 글은 사본도 만들지 않습니다

    const key = ogManifestKey(type, slug);
    if (!key) continue;
    const existing = manifest[key];
    if (existing && !force && fs.existsSync(path.join(dir, existing))) {
      skipped.push(key);
      continue;
    }

    // 어떤 이미지를 복사할지: 노션 `OG 이미지` 속성(디자이너가 만든 1200×630) → 페이지 커버 → 본문 첫 이미지
    const explicitOg = seoFieldsOf(row).ogImage;
    const remote =
      [explicitOg, textOf(row.__cover)].find((u) => u && /^https?:/i.test(u)) ??
      (() => {
        const fromPage = pages[row.id] ? coverFromPageMap(pages[row.id], row.id) : null;
        return fromPage?.url ?? "";
      })();
    if (!remote || !/^https?:/i.test(remote)) {
      skipped.push(`${key} (이미지 없음)`);
      continue;
    }

    try {
      const { buf, ext } = await fetchImage(remote);
      const file = fileNameFor(key, ext);
      fs.writeFileSync(path.join(dir, file), buf);
      manifest[key] = file;
      saved.push(`${key} → ${file} (${(buf.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
      failed.push(`${key}: ${e?.message ?? e}`);
    }
  }

  // 키를 정렬해 저장 — 같은 입력이면 같은 파일(멱등)
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestAbs, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  log(`✔ OG 이미지: 새로 받음 ${saved.length} · 이미 있음 ${skipped.length} · 실패 ${failed.length}`);
  for (const line of saved.slice(0, 5)) log(`  + ${line}`);
  if (saved.length > 5) log(`  … 외 ${saved.length - 5}건`);
  for (const line of failed) log(`  ⚠️ ${line}`);
  return { saved, skipped, failed, manifest: sorted };
}

/* ------------------------------ CLI ------------------------------ */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const snapIndex = args.indexOf("--snapshot");
  const snapshotPath = snapIndex >= 0 ? path.resolve(args[snapIndex + 1]) : path.join(REPO_ROOT, "notion-content.json");
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const result = await localizeOgImages({
    rows: snapshot.rows ?? [],
    pages: snapshot.pages ?? {},
    force: args.includes("--force"),
  });
  // 실패가 있어도 빌드를 막지 않습니다(로컬 사본이 없는 글은 기존처럼 노션 주소를 씁니다).
  process.exit(0);
}
