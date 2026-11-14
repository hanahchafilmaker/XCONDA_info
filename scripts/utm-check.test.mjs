/**
 * UTM 링크 검사기 회귀 테스트 — 2026-11-09
 *
 * 규칙(`reports/utm-rules-20261109.md`)이 문서로만 남지 않도록,
 * ① 표준 예시가 전부 통과하는지 ② 흔한 실수가 실제로 오류로 잡히는지를 고정합니다.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { ALLOWED_MEDIUM, ALLOWED_SOURCE, EXAMPLES, checkLink } from "./utm-check.mjs";
import { productLinks, wwwUrl } from "../src/content/cta.js";

const build = (query) => `https://www.xconda.ai/?${query}`;

test("표준 예시는 오류 없이 통과한다", () => {
  for (const url of EXAMPLES) {
    const result = checkLink(url);
    assert.deepEqual(result.errors, [], `${url} → ${result.errors.join(" / ")}`);
  }
});

test("허용값 목록은 문서와 같은 여섯 종류 medium 을 쓴다", () => {
  assert.deepEqual(ALLOWED_MEDIUM, ["social", "video", "community", "email", "paid"]);
  assert.ok(ALLOWED_SOURCE.includes("newsletter"));
  assert.ok(ALLOWED_SOURCE.includes("x"));
  assert.ok(!ALLOWED_SOURCE.includes("twitter"), "X 는 x 로 통일합니다");
});

test("source 대소문자·약어는 오류다", () => {
  for (const source of ["Instagram", "insta", "IG", "twitter"]) {
    const result = checkLink(build(`utm_source=${source}&utm_medium=social&utm_campaign=flexboard_202611`));
    assert.ok(result.errors.length > 0, `${source} 는 걸러져야 합니다`);
  }
});

test("medium 오용은 오류다 — newsletter·sns·social-paid", () => {
  for (const medium of ["newsletter", "sns", "social-paid", "Social"]) {
    const result = checkLink(build(`utm_source=newsletter&utm_medium=${medium}&utm_campaign=flexboard_202611`));
    assert.ok(result.errors.length > 0, `${medium} 는 걸러져야 합니다`);
  }
});

test("뉴스레터는 source=newsletter · medium=email 조합만 통과한다", () => {
  const ok = checkLink(build("utm_source=newsletter&utm_medium=email&utm_campaign=flexboard_202611"));
  assert.deepEqual(ok.errors, []);

  const wrong = checkLink(build("utm_source=mailchimp&utm_medium=email&utm_campaign=flexboard_202611"));
  assert.ok(wrong.errors.some((e) => e.includes("utm_source")), "발송 도구 이름은 source 가 아닙니다");
});

test("캠페인은 주제_연월 형식만 통과한다", () => {
  const bad = [
    "flexboard_2026-11",
    "flexboard_2026",
    "flexboard_202613",
    "플렉스보드_202611",
    "Flexboard_202611",
    "flexboard_2026년11월",
    "202611",
  ];
  for (const campaign of bad) {
    const result = checkLink(build(`utm_source=instagram&utm_medium=social&utm_campaign=${campaign}`));
    assert.ok(result.errors.length > 0, `${campaign} 는 걸러져야 합니다`);
  }
  assert.deepEqual(
    checkLink(build("utm_source=instagram&utm_medium=social&utm_campaign=case_kbs_202611")).errors,
    [],
  );
});

test("content 는 팀_게시물 형식이고 팀이 목록에 있어야 한다", () => {
  const noTeam = checkLink(build("utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_content=reel01"));
  assert.ok(noTeam.errors.length > 0);

  const unknown = checkLink(build("utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_content=xyz_post01"));
  assert.ok(unknown.errors.some((e) => e.includes("팀")));

  const ok = checkLink(build("utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_content=cb_post03"));
  assert.deepEqual(ok.errors, []);
});

test("필수 칸이 빠지면 오류다", () => {
  const result = checkLink("https://www.xconda.ai/");
  assert.equal(result.errors.filter((e) => e.includes("필수")).length, 3);
});

test("검색광고가 아닌데 term 이 있으면 경고, 오류는 아니다", () => {
  const result = checkLink(
    build("utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_term=ai_storyboard"),
  );
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((w) => w.includes("utm_term")));

  const paid = checkLink(
    build("utm_source=instagram&utm_medium=paid&utm_campaign=flexboard_202611&utm_term=ai_storyboard"),
  );
  assert.deepEqual(paid.errors, []);
  assert.ok(!paid.warnings.some((w) => w.includes("utm_term")));
});

test("모르는 utm_ 파라미터와 중복 파라미터는 오류다", () => {
  const unknown = checkLink(
    build("utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_id=abc"),
  );
  assert.ok(unknown.errors.some((e) => e.includes("utm_id")));

  const dup = checkLink(
    build("utm_source=instagram&utm_source=youtube&utm_medium=social&utm_campaign=flexboard_202611"),
  );
  assert.ok(dup.errors.some((e) => e.includes("두 번")));
});

test("앵커 뒤 파라미터와 단축 주소를 잡아낸다", () => {
  const anchor = checkLink("https://www.xconda.ai/#pricing?utm_source=instagram");
  assert.ok(anchor.errors.some((e) => e.includes("앵커")));

  const short = checkLink("https://bit.ly/abc123");
  assert.ok(short.warnings.some((w) => w.includes("단축")));
});

test("유료는 source 를 바꾸지 않고 medium=paid 로 구분한다", () => {
  const wrong = checkLink(build("utm_source=instagram_ads&utm_medium=paid&utm_campaign=flexboard_202611"));
  assert.ok(wrong.errors.some((e) => e.includes("utm_source")));

  const ok = checkLink(build("utm_source=instagram&utm_medium=paid&utm_campaign=flexboard_202611"));
  assert.deepEqual(ok.errors, []);
});

test("community 는 커스텀 채널 그룹 확인을 경고한다", () => {
  const result = checkLink(build("utm_source=reddit&utm_medium=community&utm_campaign=flexboard_202611"));
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((w) => w.includes("Community")));
});

test("허브 글의 제품 사이트 링크는 규칙을 통과한다 (§6-1)", () => {
  for (const lang of ["ko", "en", "ja", "zh"]) {
    for (const placement of ["top", "bottom"]) {
      const { links } = productLinks({ lang, title: "FLEXBOARD 7단계", placement });
      assert.deepEqual(links.map((l) => l.kind), ["tool", "start", "pricing"]);
      for (const link of links) {
        const result = checkLink(link.href);
        assert.deepEqual(result.errors, [], `${link.href} → ${result.errors.join(" / ")}`);
        assert.equal(new URL(link.href).hostname, "www.xconda.ai");
      }
    }
  }
  assert.match(wwwUrl("/pricing", "top"), /utm_content=cb_top$/);
  // 관련 툴이 없으면 툴 링크를 만들지 않는다
  assert.deepEqual(productLinks({ lang: "en", title: "Refund policy" }).links.map((l) => l.kind), ["start", "pricing"]);
});

test("hub·referral 은 서로 짝으로만, 제품 사이트로 가는 링크에만 쓴다", () => {
  const bad = [
    build("utm_source=hub&utm_medium=social&utm_campaign=hub_cta_202611"),
    build("utm_source=instagram&utm_medium=referral&utm_campaign=hub_cta_202611"),
    "https://hub.xconda.ai/en/?utm_source=hub&utm_medium=referral&utm_campaign=hub_cta_202611",
  ];
  for (const url of bad) assert.ok(checkLink(url).errors.length > 0, `${url} 는 걸러져야 합니다`);
});
