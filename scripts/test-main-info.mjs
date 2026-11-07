// React server rendering + DOM unit assertions; no browser automation/network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(join(tmpdir(), 'inal-main-info-test-'));
after(() => rmSync(temp, { recursive: true, force: true }));
const result = await build({ stdin: { contents: `
  import React from 'react';
  import {renderToStaticMarkup} from 'react-dom/server';
  import {DataSourceLabel} from './src/components/common/DataSourceLabel';
  import {InfoTip,InfoTipAuto} from './src/components/common/InfoTip';
  import {StoryCard} from './src/components/cards/StoryCard';
  export function render(name, props) {
    return renderToStaticMarkup(React.createElement({DataSourceLabel,InfoTip,InfoTipAuto,StoryCard}[name],props));
  }
`, loader: 'tsx', resolveDir: root }, bundle: true, platform: 'node', format: 'cjs', write: false });
const output = join(temp, 'components.cjs');
writeFileSync(output, result.outputFiles[0].contents);
const { render } = createRequire(import.meta.url)(output);

test('mobile provenance retains observation/forecast time and developer caveat, never source IDs/methods', () => {
  const props = { provenance: { kind: 'obs', sourceName: 'ASOS secret-source', referenceTime: '2026-11-08 08:00 KST · 격자60,127', note: '표본7/7, 검증 근거' } };
  const html = render('DataSourceLabel', props);
  assert.match(html, /실황 · 2026-11-08 08:00/);
  assert.doesNotMatch(html, /ASOS|secret-source|격자|표본|근거|button/);
  assert.match(render('DataSourceLabel', { provenance: { ...props.provenance, kind: 'fcst' } }), /예보/);
  assert.equal(render('DataSourceLabel', { provenance: { ...props.provenance, kind: 'stats' } }), '');
  assert.match(render('DataSourceLabel', { provenance: { ...props.provenance, isDevFallback: true } }), /개발용 자료/);
});
test('technical help/calculation explanations absent but main summaries are ordinary complete text', () => {
  assert.equal(render('InfoTip', { detail: '기술 근거', tag: '출처' }), '');
  assert.equal(render('InfoTipAuto', { text: '서버 계산 검증 기준', label: '계산 기준' }), '');
  const summary = '어제보다 3.5℃ 따뜻해요. 최근 일주일 평균보다는 2.6℃ 낮아요.';
  const html = render('InfoTipAuto', { text: summary, label: '비교 기준' });
  assert.match(html, /어제보다 3.5℃/); assert.match(html, /2.6℃ 낮아요/);
  assert.doesNotMatch(html, /button|it-pop|자세히|…/);
});
test('existing story cards show the conclusion and core visualization, not evidence drawers', () => {
  const dom = new JSDOM(render('StoryCard', { story: {
    title: '복날은 정말 더울까?', badgeText: '여름 이야기', highlightValue: '+2.1℃', summary: '서울은 주변보다 더웠어요.',
    tags: ['서울'], provenance: { kind: 'stats', sourceName: 'ASOS 근거' }, detail: { title: '자료 검증' },
  }, children: '핵심 기온 그래프', onOpenDetail: () => {} }));
  assert.match(dom.window.document.body.textContent, /서울은 주변보다 더웠어요/);
  assert.match(dom.window.document.body.textContent, /핵심 기온 그래프/);
  assert.equal(dom.window.document.querySelector('button'), null);
  assert.doesNotMatch(dom.window.document.body.textContent, /ASOS|근거|검증/);
  dom.window.close();
});
test('mobile consumer opts out explicitly; secondary yearly evidence and raw station IDs are not rendered', () => {
  const panel = readFileSync(join(root, 'src/components/cards/WeatherContextPanel.tsx'), 'utf8');
  assert.match(panel, /showEvidence: false/);
  const series = readFileSync(join(root, 'src/components/cards/DateSeriesCard.tsx'), 'utf8');
  assert.doesNotMatch(series, /data-testid="series-table"|data-testid="series-download"|station\.id/);
  assert.match(series, /<SeriesChart/); assert.match(series, /<PointReadout/);
});
