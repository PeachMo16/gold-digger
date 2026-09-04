import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { askLibrary, draftCard, getLibrary, recordEvent, saveCard } from './library-core.mjs';
import { check } from './check.mjs';

function mine(t) {
  const root = mkdtempSync(join(tmpdir(), 'gold-library-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['finds', 'digs', 'deaths']) mkdirSync(join(root, dir));
  writeFileSync(join(root, 'queue.md'), '- [accepted] LEAD-0001 · historical sensor cost\n- [accepted] LEAD-0002 · prototype design\n- [falsified] LEAD-0003 · sensor impossibility\n- [rejected] LEAD-0004 · sensor project outside operator interests\n');
  writeFileSync(join(root, 'taste.md'), '# taste\n## verdict log\n');
  writeFileSync(join(root, 'finds/LEAD-0001.md'), '# Sensor cost\n## three sentences\nA sensor was too expensive in this synthetic example.\n');
  writeFileSync(join(root, 'finds/LEAD-0002.md'), '# Prototype design\n## three sentences\nA prototype requires the sensor.\n');
  for (const id of ['LEAD-0001', 'LEAD-0002']) writeFileSync(join(root, 'digs', `${id}.md`), '# Synthetic dig\nNo scientific claim.\n');
  writeFileSync(join(root, 'deaths/LEAD-0003.md'), '# Synthetic sensor death\nwhat would change my mind: corrected sensor measurement\n');
  return root;
}

function card(id = 'LEAD-0001') {
  return { version: 1, leadId: id, title: 'Synthetic sensor route', questions: ['Reduce sensor cost', '怎样降低传感器成本'],
    candidateUse: 'Test a cheaper sensor in a prototype; an unvalidated application hypothesis.',
    limitations: ['Synthetic fixture, not a real technology or market result.'],
    conditions: [{ id: 'price', description: 'Sensor fits the budget', state: 'unknown', recheckWhen: 'A new documented quote arrives' }],
    nextTest: { action: 'Obtain one written quote', deliverable: 'Dated quote and comparison', pass: 'Quoted total at or below the declared budget', fail: 'Quoted total above budget', budget: '30 minutes; no purchases' },
    sources: [{ path: `finds/${id}.md`, quote: id === 'LEAD-0001' ? 'A sensor was too expensive in this synthetic example.' : 'A prototype requires the sensor.' }],
    dependsOn: [], reviewedEventIds: [] };
}

test('legacy Markdown is searchable without rewriting the mine or fabricating a plan', (t) => {
  const root = mine(t), before = readFileSync(join(root, 'queue.md'), 'utf8');
  const results = askLibrary(root, 'sensor');
  assert.ok(results.some((r) => r.leadId === 'LEAD-0001' && r.card === null));
  assert.ok(results.some((r) => r.status === 'falsified'));
  assert.ok(results.every((r) => r.status !== 'rejected'));
  assert.ok(askLibrary(root, 'sensor', { includeRejected: true, limit: 10 }).some((r) => r.status === 'rejected'));
  assert.equal(readFileSync(join(root, 'queue.md'), 'utf8'), before);
  assert.equal(readdirSync(root).includes('library'), false);
  assert.deepEqual(askLibrary(root, 'unrelatedhydrodynamics'), []);
});

test('curated routes include proposed use, blockers and falsifiable next tests in English and Chinese', (t) => {
  const root = mine(t);
  const saved = saveCard(root, card());
  assert.match(saved.sources[0].sha256, /^[a-f0-9]{64}$/);
  const entry = askLibrary(root, '降低传感器成本')[0];
  assert.equal(entry.leadId, 'LEAD-0001');
  assert.equal(entry.needsReview, false);
  assert.equal(entry.card.nextTest.budget, '30 minutes; no purchases');
  assert.ok(entry.match.terms.includes('成本'));
  assert.deepEqual(check(root).errors, []);
});

test('a source edit alerts the card and all declared dependent plans without changing verdicts', (t) => {
  const root = mine(t);
  const first = saveCard(root, card());
  saveCard(root, { ...card('LEAD-0002'), dependsOn: ['LEAD-0001'] });
  writeFileSync(join(root, 'finds/LEAD-0001.md'), '# Correction\nThe original synthetic premise was wrong.\n');
  const entries = getLibrary(root);
  const a = entries.find((e) => e.leadId === 'LEAD-0001');
  const b = entries.find((e) => e.leadId === 'LEAD-0002');
  assert.ok(a.reviewReasons.some((r) => r.includes('quote no longer present')));
  assert.ok(b.reviewReasons.includes('dependency needs review: LEAD-0001'));
  assert.equal(a.status, 'accepted');
  assert.throws(() => saveCard(root, first), /quoted evidence not found|source changed/);
});

test('a dependency without a curated card still invalidates a saved dependent plan when its research changes', (t) => {
  const root = mine(t);
  saveCard(root, { ...card('LEAD-0002'), dependsOn: ['LEAD-0001'] });
  writeFileSync(join(root, 'finds/LEAD-0001.md'), '# New evidence\n');
  assert.ok(getLibrary(root).find((e) => e.leadId === 'LEAD-0002').reviewReasons.includes('dependency research changed: LEAD-0001'));
});

test('evidence events resurface leads, persist test outcomes, and cannot be overwritten or approve research', (t) => {
  const root = mine(t), before = readFileSync(join(root, 'queue.md'), 'utf8');
  saveCard(root, card());
  writeFileSync(join(root, 'digs/LEAD-0001.quote.md'), 'Synthetic vendor quote: 20 units.\n');
  const event = { version: 1, id: 'EV-quote-1', leadId: 'LEAD-0001', kind: 'condition-change', conditionId: 'price', summary: 'A candidate quote could change the price barrier',
    sources: [{ path: 'digs/LEAD-0001.quote.md', quote: 'Synthetic vendor quote: 20 units.' }] };
  recordEvent(root, event);
  assert.throws(() => recordEvent(root, event), /EEXIST/);
  recordEvent(root, { ...event, id: 'EV-test-1', kind: 'test-result', conditionId: undefined, outcome: 'fail', summary: 'Synthetic quote exceeds this test budget' });
  const entry = getLibrary(root).find((e) => e.leadId === 'LEAD-0001');
  assert.equal(entry.needsReview, true);
  assert.equal(entry.card.conditions[0].state, 'unknown');
  assert.equal(entry.events.find((e) => e.id === 'EV-test-1').outcome, 'fail');
  assert.equal(readFileSync(join(root, 'queue.md'), 'utf8'), before);
  const reviewed = saveCard(root, { ...entry.card, reviewedEventIds: ['EV-quote-1', 'EV-test-1'] });
  assert.equal(getLibrary(root).find((e) => e.leadId === 'LEAD-0001').needsReview, false);
  assert.equal(readdirSync(join(root, 'library/revisions')).length, 1);
  assert.equal(reviewed.sources[0].sha256, entry.card.sources[0].sha256);
});

test('drafts stay incomplete until the author supplies sources and a test with pass/fail criteria', (t) => {
  const root = mine(t);
  const draft = draftCard(root, 'LEAD-0001');
  assert.equal(draft.title, '');
  assert.throws(() => saveCard(root, draft), /title/);
  assert.throws(() => saveCard(root, { ...card(), nextTest: { ...card().nextTest, fail: '' } }), /nextTest.fail/);
  assert.throws(() => saveCard(root, { ...card(), status: 'accepted' }), /unknown field status/);
  assert.throws(() => saveCard(root, { ...card(), sources: [{ path: 'finds/LEAD-0001.md', quote: 'invented evidence' }] }), /quoted evidence not found/);
});

test('paths cannot escape the mine, including research symlinks', (t) => {
  const root = mine(t);
  for (const path of ['../outside.md', '/etc/passwd']) {
    assert.throws(() => saveCard(root, { ...card(), sources: [{ path, quote: 'x' }] }), /relative research file/);
  }
  symlinkSync('/etc/hosts', join(root, 'digs/escape.md'));
  assert.throws(() => saveCard(root, { ...card(), sources: [{ path: 'digs/escape.md', quote: 'localhost' }] }), /escapes mine/);
});

test('dependencies must exist and cannot create cycles', (t) => {
  const root = mine(t);
  assert.throws(() => saveCard(root, { ...card(), dependsOn: ['LEAD-0999'] }), /unknown dependency/);
  saveCard(root, { ...card(), dependsOn: ['LEAD-0002'] });
  assert.throws(() => saveCard(root, { ...card('LEAD-0002'), dependsOn: ['LEAD-0001'] }), /dependency cycle/);
});

test('unknown event conditions and outcome kinds fail before writing', (t) => {
  const root = mine(t); saveCard(root, card());
  const event = { version: 1, id: 'EV-bad', leadId: 'LEAD-0001', kind: 'condition-change', conditionId: 'made-up', summary: 'x', sources: card().sources };
  assert.throws(() => recordEvent(root, event), /unknown condition/);
  assert.throws(() => recordEvent(root, { ...event, kind: 'test-result', conditionId: undefined, outcome: 'approved' }), /outcome must/);
});

test('CLI supports machine-readable plans, rejects invalid limits, and diagnoses corrupted records', (t) => {
  const root = mine(t); saveCard(root, card());
  const script = new URL('./library.mjs', import.meta.url).pathname;
  const run = (...args) => spawnSync(process.execPath, [script, ...args, '--root', root], { encoding: 'utf8' });
  const result = run('ask', 'sensor cost', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].card.leadId, 'LEAD-0001');
  assert.equal(run('ask', 'sensor', '--limit', 'NaN').status, 1);
  writeFileSync(join(root, 'library/cards/LEAD-0001.json'), '{broken');
  assert.equal(run('review').status, 1);
  assert.ok(check(root).errors.some((e) => e.startsWith('library:')));
});
