import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLegacyRecordMap, blocksToHtml } from '../src/content/body.js';
import { mentionIndex } from '../src/content/mentions.js';
const page = '11111111-2222-3333-4444-555555555555';
const pub = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const privateId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
test('공개된 페이지 멘션은 허브 링크, 미게시 페이지는 제목만; 날짜·사람도 표시한다', () => {
  const map = {
    [page]: { value: { id: page, type: 'page', content: ['text'] } },
    text: { value: { id: 'text', type: 'text', properties: { title: [['‣', [['p', pub]]], [' / '], ['‣', [['p', privateId]]], [' / '], ['‣', [['d', { start_date: '2026-11-01' }]]], [' / '], ['‣', [['u', 'id', '김하나']]]] } } },
    [privateId]: { value: { id: privateId, type: 'page', properties: { title: [['비공개 대상']] } } },
  };
  const index = mentionIndex([{ id: pub, Title: '공개 글', Published: true, __type: 'blog', Slug: 'public-post' }, { id: privateId, Title: '비공개 대상', Published: false, __type: 'blog', Slug: 'private-post' }], 'https://hub.xconda.ai/');
  const unresolved = [];
  const html = blocksToHtml(parseLegacyRecordMap(map, page, { mentions: index, onUnresolved: id => unresolved.push(id) }));
  assert.match(html, /href="https:\/\/hub\.xconda\.ai\/post\/public-post\/"[^>]*>공개 글/);
  assert.match(html, /비공개 대상/); assert.doesNotMatch(html, /private-post|‣/);
  assert.match(html, /2026-11-01/); assert.match(html, /김하나/); assert.deepEqual(unresolved, [privateId]);
});
