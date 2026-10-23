import test from "node:test";
import assert from "node:assert/strict";
import {
  INDEXNOW_ENDPOINT,
  makeIndexNowPayload,
  sitemapUrls,
  submitIndexNow,
  waitForPublicKey,
} from "./indexnow.mjs";

const KEY = "0123456789abcdef0123456789abcdef";

test("sitemap URL을 파싱하고 XML entity를 복원한다", () => {
  assert.deepEqual(
    sitemapUrls("<urlset><url><loc>https://hub.example/a?x=1&amp;y=2</loc></url><url><loc>https://hub.example/b/</loc></url></urlset>"),
    ["https://hub.example/a?x=1&y=2", "https://hub.example/b/"],
  );
});

test("IndexNow payload는 같은 HTTPS 호스트만 담고 중복 URL을 제거한다", () => {
  const payload = makeIndexNowPayload({
    urls: ["https://hub.example/", "https://hub.example/post/a/", "https://hub.example/"],
    siteUrl: "https://hub.example/",
    key: KEY,
    keyLocation: `https://hub.example/${KEY}.txt`,
  });
  assert.deepEqual(payload, {
    host: "hub.example",
    key: KEY,
    keyLocation: `https://hub.example/${KEY}.txt`,
    urlList: ["https://hub.example/", "https://hub.example/post/a/"],
  });
});

test("payload 생성 시 다른 호스트·HTTP URL·잘못된 key를 거부한다", () => {
  const base = { siteUrl: "https://hub.example/", key: KEY, keyLocation: `https://hub.example/${KEY}.txt` };
  assert.throws(() => makeIndexNowPayload({ ...base, urls: ["https://evil.example/"] }), /다른 URL/);
  assert.throws(() => makeIndexNowPayload({ ...base, urls: ["http://hub.example/"] }), /다른 URL/);
  assert.throws(() => makeIndexNowPayload({ ...base, key: "bad", urls: ["https://hub.example/"] }), /key는 32자리/);
  assert.throws(() => makeIndexNowPayload({ ...base, urls: [] }), /URL이 없습니다/);
});

test("공개 key 파일이 사이트에서 확인될 때까지 기다린다", async () => {
  let calls = 0;
  await waitForPublicKey(`https://hub.example/${KEY}.txt`, KEY, async () => {
    calls += 1;
    return calls === 1
      ? { ok: false, status: 404, text: async () => "" }
      : { ok: true, status: 200, text: async () => `${KEY}\n` };
  }, { attempts: 2, delayMs: 0 });
  assert.equal(calls, 2);
  await assert.rejects(
    waitForPublicKey(`https://hub.example/${KEY}.txt`, KEY, async () => ({ ok: true, status: 200, text: async () => "wrong" }), { attempts: 1, delayMs: 0 }),
    /내용 불일치/,
  );
});

test("IndexNow는 HTTP 200·202를 접수로 처리하고 나머지는 오류로 알린다", async () => {
  const payload = { host: "hub.example", key: KEY, keyLocation: `https://hub.example/${KEY}.txt`, urlList: ["https://hub.example/"] };
  let request;
  const status = await submitIndexNow(payload, async (url, init) => {
    request = { url, init };
    return { status: 202, text: async () => "" };
  });
  assert.equal(status, 202);
  assert.equal(request.url, INDEXNOW_ENDPOINT);
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(request.init.body), payload);
  await assert.rejects(
    submitIndexNow(payload, async () => ({ status: 403, text: async () => "invalid key" })),
    /IndexNow 응답 오류 403: invalid key/,
  );
});
