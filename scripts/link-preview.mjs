#!/usr/bin/env node
/* =============================================================================
 * 뉴스 Link(원문 기사)의 og:image 를 **우리 도메인으로 받아 두는** 스크립트
 * -----------------------------------------------------------------------------
 * 뉴스 글의 `Link` 속성은 원문 기사 주소입니다. 이미지가 없는 행은 목록 썸네일이
 * 빈 자리 표시자로만 남았는데, 원문 페이지의 og:image 를 내려받아
 * `assets/img/og/link/` 에 두면 목록 썸네일 · 글 상세 커버 · 공유 미리보기로 씁니다.
 *
 *   node scripts/link-preview.mjs [--snapshot notion-content.json] [--force]
 *
 * · 뉴스(`__type=news`) 행만, og:image 를 받을 자리가 없는 행(Cover · __cover ·
 *   OG 이미지 · 본문 이미지가 하나도 없음)만 받습니다.
 * · 받은 이미지는 행의 `__linkImage` 필드에 상대 경로로 적습니다
 *   (build-seo 는 og:image 에서 절대 주소로 바꿔 씁니다).
 * · manifest(assets/img/og/link/manifest.json)에 주소 → 파일을 쌓아 두어,
 *   스냅샷이 다시 생성되어도 재다운로드하지 않습니다. `--force` 로 다시 받습니다.
 * · 네트워크가 없거나 일부가 실패해도 **빌드는 계속**됩니다(실패 목록만 보고).
 * · manifest 는 키를 정렬해 써서 같은 입력이면 같은 파일이 나옵니다(멱등).
 *
 * 실패해도 스냅샷을 망치지 않도록, 행을 바꾼 경우에만 스냅샷을 다시 씁니다.
 * ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { COVER_KEYS, coverFromPageMap } from "../src/content/fields.js";
import { fileUrlOf, pickProp, seoFieldsOf, textOf } from "../src/content/seo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

/** 저장 디렉터리 · manifest (repo 상대, 루트 슬래시로 시작하는 상대 경로로 노출) */
export const LINK_IMAGE_DIR = "assets/img/og/link";
export const LINK_MANIFEST_PATH = `${LINK_IMAGE_DIR}/manifest.json`;

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_HTML_BYTES = 1_500_000; // og:image 은 <head> 에 있으므로 1.5MB 만 읽습니다
const TIMEOUT_MS = 20_000;
/** 봇 차단을 피하되 우리 식별을 남기는 UA (로컬 fetch 성공률 확보) */
const UA = "Mozilla/5.0 (compatible; XCONDA-Hub-LinkPreview/1.0; +https://hub.xconda.ai/)";

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

/**
 * HTML 에서 og:image(없으면 twitter:image) 주소를 찾아 절대 주소로 돌려줍니다.
 * `property=` · `content=` 순서와 따옴표 종류를 가리지 않습니다.
 */
export function extractOgImage(html, baseUrl) {
  const metas = String(html ?? "").match(/<meta\b[^>]*>/gi) ?? [];
  const keys = ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"];
  for (const key of keys) {
    for (const tag of metas) {
      const pm = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag);
      if (!pm || pm[1].toLowerCase() !== key) continue;
      const cm = /content\s*=\s*["']([^"']+)["']/i.exec(tag);
      if (!cm?.[1]) continue;
      const raw = cm[1].replace(/&amp;/gi, "&").trim();
      if (!raw) continue;
      try {
        const abs = new URL(raw, baseUrl).href;
        if (/^https?:/i.test(abs)) return abs;
      } catch {
        /* 깨진 주소는 건너뜁니다 */
      }
    }
  }
  return "";
}

/** 이미지 다운로드 — localize-og-images 와 같은 제약(형식 · 크기 · 타임아웃) */
async function fetchImage(url, fetchImpl) {
  const res = await fetchImpl(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": UA, accept: "image/*,*/*;q=0.8" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXT_BY_TYPE[type] || extFromUrl(url);
  if (!ext) throw new Error(`이미지 형식을 알 수 없음 (content-type: ${type || "없음"})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("빈 응답");
  if (buf.length > MAX_BYTES) throw new Error(`${(buf.length / 1024 / 1024).toFixed(1)}MB — 너무 큼`);
  return { buf, ext };
}

/** 행이 이미 다른 이미지를 가지고 있으면 링크 og:image 가 필요 없습니다. */
function hasOwnImage(row, pages) {
  if (fileUrlOf(pickProp(row, COVER_KEYS))) return true;
  if (textOf(row.__cover)) return true;
  if (seoFieldsOf(row).ogImage) return true;
  if (pages?.[row.id]) {
    const body = coverFromPageMap(pages[row.id], row.id);
    if (body?.url) return true;
  }
  return false;
}

/**
 * 뉴스 행의 Link 원문에서 og:image 를 내려받아 `row.__linkImage` 에 적습니다.
 * 받아둔 파일은 manifest 캐시로 재사용합니다(스냅샷 재생성 · 재시도 모두 멱등).
 *
 * @returns {{ saved: string[], reused: string[], failed: string[], mutated: boolean, manifest: Record<string,string> }}
 */
export async function collectLinkPreviews({
  rows = [],
  pages = {},
  root = REPO_ROOT,
  force = false,
  log = console.log,
  fetchImpl = fetch,
} = {}) {
  const dir = path.join(root, LINK_IMAGE_DIR);
  const manifestAbs = path.join(root, LINK_MANIFEST_PATH);
  fs.mkdirSync(dir, { recursive: true });

  let manifest = {};
  try {
    if (fs.existsSync(manifestAbs)) manifest = JSON.parse(fs.readFileSync(manifestAbs, "utf8")) ?? {};
  } catch {
    manifest = {};
  }

  const saved = [];
  const reused = [];
  const failed = [];
  let mutated = false;

  for (const row of rows) {
    const link = textOf(pickProp(row, ["Link", "URL", "링크"])).trim();
    const wantsImage = row.__type === "news" && /^https?:\/\//i.test(link) && !hasOwnImage(row, pages);

    // 뉴스가 아니거나 · 링크가 없거나 · 이미 이미지가 있는 행 → 필드를 비웁니다(정리)
    if (!wantsImage) {
      if (row.__linkImage !== undefined) {
        delete row.__linkImage;
        mutated = true;
      }
      continue;
    }

    // 캐시에 있고 파일도 살아 있으면 재다운로드하지 않습니다
    const cached = manifest[link];
    if (!force && cached && fs.existsSync(path.join(dir, cached))) {
      const target = `/${LINK_IMAGE_DIR}/${cached}`;
      if (row.__linkImage !== target) {
        row.__linkImage = target;
        mutated = true;
      }
      reused.push(link);
      continue;
    }

    try {
      const pageRes = await fetchImpl(link, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
      });
      if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
      const pageUrl = pageRes.url || link;
      const pageType = (pageRes.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

      let buf;
      let ext;
      if (pageType.startsWith("image/")) {
        // Link 가 이미지 파일을 바로 가리키는 경우
        buf = Buffer.from(await pageRes.arrayBuffer());
        if (!buf.length) throw new Error("빈 응답");
        if (buf.length > MAX_BYTES) throw new Error(`${(buf.length / 1024 / 1024).toFixed(1)}MB — 너무 큼`);
        ext = EXT_BY_TYPE[pageType] || extFromUrl(pageUrl);
        if (!ext) throw new Error(`이미지 형식을 알 수 없음 (content-type: ${pageType})`);
      } else {
        // HTML 은 머리글(MAX_HTML_BYTES)만 잘라 읽고 og:image 를 찾습니다.
        // (응답이 더 작으면 그 크기까지만 — Buffer.from 의 length 는 실제 크기를 넘을 수 없습니다)
        const htmlBuf = Buffer.from(await pageRes.arrayBuffer());
        const og = extractOgImage(htmlBuf.subarray(0, MAX_HTML_BYTES).toString("utf8"), pageUrl);
        if (!og) throw new Error("og:image 없음");
        ({ buf, ext } = await fetchImage(og, fetchImpl));
      }

      const name = `${createHash("sha1").update(link).digest("hex").slice(0, 16)}.${ext}`;
      fs.writeFileSync(path.join(dir, name), buf);
      manifest[link] = name;
      row.__linkImage = `/${LINK_IMAGE_DIR}/${name}`;
      mutated = true;
      saved.push(`${link} → ${name} (${(buf.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
      // 실패한 주소는 남기지 않습니다 — 목록에는 채널 타일이 그대로 나옵니다.
      if (row.__linkImage !== undefined) {
        delete row.__linkImage;
        mutated = true;
      }
      failed.push(`${link}: ${e?.message ?? e}`);
    }
  }

  // 키를 정렬해 저장 — 같은 입력이면 같은 파일(멱등)
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestAbs, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  log(`✔ 뉴스 링크 미리보기: 새로 받음 ${saved.length} · 재사용 ${reused.length} · 실패 ${failed.length}`);
  for (const line of saved.slice(0, 5)) log(`  + ${line}`);
  if (saved.length > 5) log(`  … 외 ${saved.length - 5}건`);
  for (const line of failed) log(`  ⚠️ ${line}`);
  return { saved, reused, failed, mutated, manifest: sorted };
}

/* ------------------------------ CLI ------------------------------ */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const snapIndex = args.indexOf("--snapshot");
  const snapshotPath = snapIndex >= 0 ? path.resolve(args[snapIndex + 1]) : path.join(REPO_ROOT, "notion-content.json");
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const result = await collectLinkPreviews({
    rows: snapshot.rows ?? [],
    pages: snapshot.pages ?? {},
    force: args.includes("--force"),
  });
  // 행이 바뀐 경우에만 스냅샷을 다시 씁니다 — 형식은 notion-snapshot.mjs 와 동일(_COMPACT + 개행).
  if (result.mutated) {
    fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 0)}\n`, "utf8");
  }
  // 실패가 있어도 빌드를 막지 않습니다(이미지를 못 받은 행은 채널 타일로 나옵니다).
  process.exit(0);
}
