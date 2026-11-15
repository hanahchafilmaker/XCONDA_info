import test from "node:test";
import assert from "node:assert/strict";
import { socialAccountsFor, OFFICIAL_SOCIAL_URLS } from "../src/content/socialAccounts.js";
import { OFFICIAL_SAME_AS, siteJsonLd, appJsonLd } from "../src/content/seo.js";
import { channelFromUrl, classifyType } from "../src/content/classify.js";

const expected = {
  en: [
    ["instagram", "xconda_official", "https://www.instagram.com/xconda_official/"],
    ["threads", "xconda_official", "https://www.threads.com/@xconda_official"],
    ["youtube", "Xconda_official", "https://www.youtube.com/@xconda_official"],
    ["facebook", "xconda", "https://www.facebook.com/profile.php?id=61584980414012"],
  ],
  ko: [
    ["instagram", "xconda_korea", "https://www.instagram.com/xconda_korea/"],
    ["threads", "xconda_korea", "https://www.threads.com/@xconda_korea"],
    ["youtube", "xconda_korea", "https://www.youtube.com/@xconda_korea"],
    ["facebook", "엑스콘다", "https://www.facebook.com/profile.php?id=61587791698809"],
    ["x", "xconda", "https://x.com/Xconda_official/"],
  ],
};

for (const language of ["en", "ko"]) {
  test(`${language}: official accounts exactly match the operator's list`, () => {
    const actual = socialAccountsFor(language);
    assert.deepEqual(actual.map((a) => [a.id, a.handle, a.href]), expected[language]);
    assert.equal(new Set(actual.map((a) => a.id)).size, actual.length);
    for (const account of actual) assert.equal(new URL(account.href).protocol, "https:");
  });
}

test("locale policy: English regional tags use EN; other supported locales use KO", () => {
  for (const lang of ["en-US", "EN", "en_GB"]) assert.deepEqual(socialAccountsFor(lang), socialAccountsFor("en"));
  for (const lang of ["ko", "ko-KR", "ja", "zh-CN"]) assert.deepEqual(socialAccountsFor(lang), socialAccountsFor("ko"));
  assert.deepEqual(socialAccountsFor(), socialAccountsFor("ko"));
});

test("organization and product structured data use all nine confirmed profiles", () => {
  const urls = Object.values(expected).flat().map((a) => a[2]);
  assert.deepEqual(OFFICIAL_SOCIAL_URLS, urls);
  assert.deepEqual(OFFICIAL_SAME_AS, urls);
  assert.deepEqual(appJsonLd().sameAs, urls);
  for (const language of ["ko", "en", "ja", "zh"]) {
    const org = siteJsonLd("https://hub.xconda.ai/", language)[0];
    assert.deepEqual(org.sameAs.slice(2), urls);
    assert.ok(!org.sameAs.some((u) => /xconda_ai|dramajustice/.test(u)));
  }
});

test("Facebook profile links and categories classify as news without overriding explicit types", () => {
  for (const url of [expected.en[3][2], expected.ko[3][2], "https://m.facebook.com/story.php?id=123"]) {
    assert.equal(channelFromUrl(url), "facebook");
    assert.equal(classifyType({ link: url }).type, "news");
    assert.equal(classifyType({ type: "공지", link: url }).type, "notice");
  }
  assert.equal(classifyType({ category: "페이스북" }).type, "news");
  assert.equal(classifyType({ category: "Facebook" }).type, "news");
  assert.equal(channelFromUrl("https://facebook.com.evil.test/profile.php"), undefined);
  assert.equal(channelFromUrl("https://blog.naver.com/dramajustice/123"), "naver");
});
