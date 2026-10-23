#!/usr/bin/env node
/**
 * Notify IndexNow when the published sitemap changes.
 * The public key file is named with the key itself and served from the site root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SITE_URL } from "../src/content/seo.js";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_INDEXNOW_URLS = 10_000;
const KEY_FILENAME_RE = /^[a-f0-9]{32}\.txt$/i;

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function sitemapUrls(xml) {
  if (typeof xml !== "string") throw new TypeError("sitemap XML은 문자열이어야 합니다");
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
}

export function makeIndexNowPayload({ urls, siteUrl, key, keyLocation }) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("IndexNow에 보낼 URL이 없습니다");
  if (urls.length > MAX_INDEXNOW_URLS) throw new Error(`한 번에 보낼 수 있는 URL은 ${MAX_INDEXNOW_URLS.toLocaleString()}개까지입니다`);
  if (!/^[a-f0-9]{32}$/i.test(key ?? "")) throw new Error("IndexNow key는 32자리 16진수여야 합니다");

  const base = new URL(siteUrl);
  if (base.protocol !== "https:") throw new Error("IndexNow 사이트 주소는 HTTPS여야 합니다");
  const host = base.host;
  for (const item of urls) {
    const url = new URL(item);
    if (url.protocol !== "https:" || url.host !== host) {
      throw new Error(`사이트 호스트와 다른 URL은 제출할 수 없습니다: ${item}`);
    }
  }

  const keyUrl = new URL(keyLocation);
  if (keyUrl.protocol !== "https:" || keyUrl.host !== host) {
    throw new Error("keyLocation은 사이트와 같은 HTTPS 호스트여야 합니다");
  }
  return { host, key, keyLocation: keyUrl.href, urlList: [...new Set(urls)] };
}

export function findKeyFile(root) {
  const candidates = fs.readdirSync(root).filter((name) => KEY_FILENAME_RE.test(name));
  if (candidates.length !== 1) {
    throw new Error(`저장소 루트에 IndexNow key 파일이 정확히 하나 있어야 합니다 (발견: ${candidates.length})`);
  }
  const name = candidates[0];
  const key = name.slice(0, -4);
  const contents = fs.readFileSync(path.join(root, name), "utf8").trim();
  if (contents !== key) throw new Error(`IndexNow key 파일 내용이 파일명과 일치하지 않습니다: ${name}`);
  return { key, name };
}

export async function submitIndexNow(payload, fetchImpl = fetch) {
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (response.status !== 200 && response.status !== 202) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`IndexNow 응답 오류 ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.status;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForPublicKey(keyLocation, key, fetchImpl = fetch, { attempts = 12, delayMs = 5000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(keyLocation, { cache: "no-store" });
      const body = response.ok ? (await response.text()).trim() : "";
      if (response.ok && body === key) return;
      lastError = new Error(response.ok ? "공개 key 파일 확인 실패 (내용 불일치)" : `공개 key 파일 확인 실패 (HTTP ${response.status})`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw lastError;
}

async function run() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
  const sitemapPath = path.join(root, "sitemap.xml");
  const { key, name } = findKeyFile(root);
  const urls = sitemapUrls(fs.readFileSync(sitemapPath, "utf8"));
  const keyLocation = new URL(name, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).href;
  const payload = makeIndexNowPayload({ urls, siteUrl, key, keyLocation });

  console.log(`IndexNow 제출: ${payload.urlList.length}개 URL · ${payload.host}`);
  console.log("공개 key 파일이 배포될 때까지 확인합니다 (최대 60초)");
  await waitForPublicKey(payload.keyLocation, key);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const status = await submitIndexNow(payload);
      console.log(`IndexNow 접수 완료 (HTTP ${status})`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        console.warn(`IndexNow ${attempt}/3 시도 실패: ${error.message}; 잠시 후 재시도합니다`);
        await sleep(attempt * 1500);
      }
    }
  }
  throw lastError;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(`::error::IndexNow 알림 실패: ${error.message}`);
    process.exitCode = 1;
  });
}
