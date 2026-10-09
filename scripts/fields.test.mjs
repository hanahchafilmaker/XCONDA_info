/**
 * `src/content/fields.js` — 사이트와 동기화 스크립트가 함께 쓰는
 * 노션 속성 규칙(썸네일 우선순위 · 이미지 주소 변환) 단위 테스트.
 * 네트워크 없이 실행됩니다.   npm run test:unit
 */
import test from "node:test";
import assert from "node:assert/strict";
import { AUTHOR_KEYS, COVER_KEYS, coverFromPageMap, personNames, signNotionImage } from "../src/content/fields.js";

const PAGE = "11111111-2222-3333-4444-555555555555";
const IMG = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** 노션 스냅샷과 같은 record map 형태: `{ [blockId]: { value: block } }` */
const pageMap = (blocks) => Object.fromEntries(blocks.map((b) => [b.id, { value: b }]));

test("coverFromPageMap: Cover 가 없으면 본문 첫 이미지가 썸네일 (컬럼 안의 이미지도 찾음)", () => {
  const cover = coverFromPageMap(
    pageMap([
      { id: PAGE, type: "page", content: ["col-list"] },
      { id: "col-list", type: "column_list", content: ["col-1", "col-2"] },
      { id: "col-1", type: "column", content: ["text-1"] },
      { id: "text-1", type: "text", properties: { title: [["본문"]] } },
      { id: "col-2", type: "column", content: [IMG] },
      { id: IMG, type: "image", properties: { source: [["attachment:3b0838cd:image.png"]] } },
    ]),
    PAGE
  );
  assert.equal(cover?.source, "body_image");
  assert.equal(cover?.url, signNotionImage("attachment:3b0838cd:image.png", IMG));
  assert.equal(cover?.fallback, undefined); // space_id 가 없으면 대체 주소도 없습니다
});

test("coverFromPageMap: 노션 첨부는 prod-files 주소 + attachment 프록시 주소를 함께 준다", () => {
  const SPACE = "19e2ebc0-17ad-8144-8210-0003d7523b95";
  const FILE = "3b0838cd-93d6-419d-9e62-3512276b26f8";
  const cover = coverFromPageMap(
    pageMap([
      { id: PAGE, type: "page", content: [IMG] },
      { id: IMG, type: "image", space_id: SPACE, properties: { source: [[`attachment:${FILE}:image.png`]] } },
    ]),
    PAGE
  );
  assert.equal(
    cover?.url,
    `https://www.notion.so/image/${encodeURIComponent(
      `https://prod-files-secure.s3.us-west-2.amazonaws.com/${SPACE}/${FILE}/image.png`
    )}?table=block&id=${IMG}&cache=v2`
  );
  assert.equal(cover?.fallback, signNotionImage(`attachment:${FILE}:image.png`, IMG));
});

test("coverFromPageMap: 페이지 커버가 본문 이미지보다 우선", () => {
  const cover = coverFromPageMap(
    pageMap([
      { id: PAGE, type: "page", content: [IMG], format: { page_cover: "https://cdn.example.com/hero.png" } },
      { id: IMG, type: "image", properties: { source: [["attachment:3b0838cd:image.png"]] } },
    ]),
    PAGE
  );
  assert.equal(cover?.source, "page_cover");
  assert.equal(cover?.url, "https://cdn.example.com/hero.png"); // 외부 이미지는 그대로 사용
});

test("coverFromPageMap: 이미지가 없으면 null (카드에는 자리 표시자)", () => {
  const cover = coverFromPageMap(pageMap([{ id: PAGE, type: "page", content: ["t"] }, { id: "t", type: "text" }]), PAGE);
  assert.equal(cover, null);
});

test("signNotionImage: 노션 첨부 · S3 · /signed 주소는 notion.so 프록시로, 외부 주소는 그대로", () => {
  assert.equal(
    signNotionImage("attachment:3b0838cd:image.png", IMG),
    `https://www.notion.so/image/${encodeURIComponent("attachment:3b0838cd:image.png")}?table=block&id=${IMG}&cache=v2`
  );
  assert.equal(
    signNotionImage("/signed/19e2ebc0/3b0838cd/image.png?table=block", IMG).startsWith("https://www.notion.so/image/"),
    true
  );
  assert.equal(signNotionImage("https://i.imgur.com/x.png", IMG), "https://i.imgur.com/x.png");
  const already = `https://www.notion.so/image/${encodeURIComponent("attachment:x:y.png")}?table=block&id=${IMG}`;
  assert.equal(signNotionImage(already, IMG), already); // 두 번 감싸지 않습니다
  assert.equal(signNotionImage("", IMG), "");
});

test("personNames: 사람(Person) 셀은 이름만 — 계정 자리 표시자(‣)는 작성자가 되지 않는다", () => {
  assert.equal(personNames([["‣"], [["u", "abc-123", "김하나"]]]), "김하나");
  assert.equal(personNames([["‣"], [["u", "abc-123"], ["u", "def-456", "이도현"]]]), "이도현");
  assert.equal(personNames([["‣"], [["u", "abc-123"]]]), ""); // 이름을 알 수 없으면 빈 값
  assert.equal(personNames("XCONDA 팀"), "XCONDA 팀"); // 텍스트 속성도 그대로 통과
});

test("속성 이름 표는 사이트와 동기화 스크립트가 같은 것을 씁니다", () => {
  assert.deepEqual(COVER_KEYS, ["Cover", "커버", "썸네일", "Thumbnail", "Image", "이미지"]);
  assert.deepEqual(AUTHOR_KEYS, ["Author", "작성자", "글쓴이", "Written by", "By", "작성자명"]);
});
