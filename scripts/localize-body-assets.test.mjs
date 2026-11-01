import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { localizeBodyAssets } from './localize-body-assets.mjs';
import { parseLegacyRecordMap, blocksToHtml } from '../src/content/body.js';
const pageId = '11111111-2222-3333-4444-555555555555';
const blockId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const snapshot = () => ({ rows: [{ id: pageId, Title: '테스트', Published: true }], pages: { [pageId]: { [pageId]: { value: { id: pageId, type: 'page', content: [blockId] } }, [blockId]: { value: { id: blockId, type: 'file', properties: { title: [['sample.zip']], source: [['attachment:abc:sample.zip']] } } } } } });
test('업로드 첨부파일을 API로 받아 콘텐츠 해시 경로로 치환하고 재실행 시 캐시한다', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notion-body-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const data = snapshot(); let calls = 0;
  const fetcher = async (url, options) => { calls++; if (String(url).includes('api.notion.com')) { assert.equal(options.headers.Authorization, 'Bearer test'); return Response.json({ file: { type: 'file', file: { url: 'https://files.example/test?secret=temporary' } } }); } return new Response(Buffer.from('zip content'), { headers: { 'content-type': 'application/zip' } }); };
  const first = await localizeBodyAssets(data, { root, token: 'test', fetcher, log() {} });
  assert.equal(first.copied, 1); assert.deepEqual(first.warnings, []);
  const asset = data.pages[pageId][blockId].value.__localAsset;
  assert.match(asset, /^https:\/\/hub\.xconda\.ai\/assets\/notion-files\/[a-f0-9]{64}\.zip$/);
  assert.match(blocksToHtml(parseLegacyRecordMap(data.pages[pageId], pageId)), /hub\.xconda\.ai\/assets\/notion-files/);
  assert.doesNotMatch(JSON.stringify(data), /secret=temporary/);
  assert.equal((await localizeBodyAssets(data, { root, token: '', fetcher, log() {} })).copied, 0);
  assert.equal(data.pages[pageId][blockId].value.__localAsset, asset); assert.equal(calls, 2);
});
test('토큰이 없으면 실패를 경고하고 원본 주소를 지우지 않는다', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notion-body-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const data = snapshot(); const result = await localizeBodyAssets(data, { root, token: '', log() {} });
  assert.match(result.warnings[0], /NOTION_TOKEN/); assert.equal(data.pages[pageId][blockId].value.__localAsset, undefined);
});
