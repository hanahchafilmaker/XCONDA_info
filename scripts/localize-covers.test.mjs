import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { localizeCovers } from "./localize-covers.mjs";

test("Notion Cover 를 로컬에 저장하고 재동기화는 캐시하며 변경·실패 시 낡은 이미지를 쓰지 않는다", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "covers-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const row = { id: "page1", Cover: [{ url: "https://app.notion.com/image/first?table=block&id=page1" }] };
  const snapshot = { rows: [row] };
  let calls = 0;
  const fetcher = async (url) => {
    calls++;
    assert.match(url, /^https:\/\/www\.notion\.so\/image\//);
    return new Response(Buffer.from("test image"), { headers: { "content-type": "image/png" } });
  };
  assert.equal((await localizeCovers(snapshot, { root, fetcher, log() {} })).saved, 1);
  const first = row.__coverLocal;
  assert.ok(fs.existsSync(path.join(root, first)));
  assert.equal((await localizeCovers(snapshot, { root, fetcher, log() {} })).cached, 1);
  assert.equal(calls, 1);
  row.Cover[0].url = "https://app.notion.com/image/changed?table=block&id=page1";
  assert.equal((await localizeCovers(snapshot, { root, fetcher: async () => new Response("forbidden", { status: 403 }), log() {} })).failed, 1);
  assert.equal(row.__coverLocal, undefined);
  assert.equal((await localizeCovers(snapshot, { root, fetcher, log() {} })).saved, 1);
  assert.notEqual(row.__coverLocal, first);
});

test("HTML 오류 응답이나 외부 호스트는 이미지로 저장하지 않는다", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "covers-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const rows = [{ id: "1", Cover: [{ url: "https://www.notion.so/image/a" }] }, { id: "2", Cover: [{ url: "https://example.com/a.png" }] }];
  let calls = 0;
  const result = await localizeCovers({ rows }, { root, log() {}, fetcher: async () => { calls++; return new Response("login", { headers: { "content-type": "text/html" } }); } });
  assert.equal(result.failed, 1);
  assert.equal(calls, 1);
  assert.ok(rows.every((row) => !row.__coverLocal));
});
