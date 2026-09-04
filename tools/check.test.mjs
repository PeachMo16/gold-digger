import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, STATES } from './check.mjs';

const fx = (n) => new URL(`./fixtures/${n}/`, import.meta.url).pathname;

function mine(t) {
  const root = mkdtempSync(join(tmpdir(), 'gold-digger-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(fx('good'), root, { recursive: true });
  return root;
}

test('a well-formed mine passes with no errors', () => {
  const r = check(fx('good'));
  assert.deepEqual(r.errors, []);
  assert.equal(r.leads, 4);
  assert.deepEqual(r.provenance, { operator: 2, adopted: 1, untagged: 0 });
});

test('the shipped templates pass (an empty mine is a valid mine)', () => {
  const r = check(new URL('../templates/', import.meta.url).pathname);
  assert.deepEqual(r.errors, []);
});

test('an accepted finding cannot use its dispatch log as the missing research report', (t) => {
  const root = mine(t);
  rmSync(join(root, 'digs/LEAD-0001.md'));
  assert.ok(check(root).errors.some((e) => /LEAD-0001 is \[accepted\] but has no dig report/.test(e)));
});

test('an uncertain lead must put its resolution note in research, not dispatch metadata', (t) => {
  const root = mine(t);
  writeFileSync(join(root, 'digs/LEAD-0004.md'), '# Unresolved research\n');
  writeFileSync(join(root, 'digs/LEAD-0004.dispatch.md'), '# Dispatch\nwhat-would-resolve-this: fetch the paper\n');
  assert.ok(check(root).errors.some((e) => /LEAD-0004 is \[uncertain\] but no dig report carries/.test(e)));
});

test('artifacts belonging to a longer lead ID cannot satisfy a shorter lead', (t) => {
  const root = mine(t);
  for (const dir of ['digs', 'finds']) {
    renameSync(join(root, dir, 'LEAD-0001.md'), join(root, dir, 'LEAD-00010.md'));
  }
  const { errors } = check(root);
  assert.ok(errors.some((e) => /LEAD-0001 is \[accepted\] but has no dig report/.test(e)));
  assert.ok(errors.some((e) => /LEAD-0001 is \[accepted\] but has no find/.test(e)));
});

test('lettered and descriptive dig report names remain compatible with existing mines', (t) => {
  const root = mine(t);
  for (const name of ['LEAD-0001.A.md', 'LEAD-0001-A1-death-certificate.md']) {
    renameSync(join(root, 'digs/LEAD-0001.md'), join(root, 'digs', name));
    assert.deepEqual(check(root).errors, []);
    renameSync(join(root, 'digs', name), join(root, 'digs/LEAD-0001.md'));
  }
});

test('every protocol violation in the broken fixture is named', () => {
  const { errors } = check(fx('bad'));
  const expect = [
    /LEAD-0001 is \[accepted\] but has no find/,
    /LEAD-0002 is \[falsified\] but has no death file/,
    /LEAD-0002 appears twice/,
    /LEAD-0003 has unknown status "\[sleeping\]"/,
    /LEAD-0004 is \[uncertain\] but no dig report carries a what-would-resolve-this note/,
    /LEAD-0004 has 3 verification digs — cap is two/,
    /deaths\/LEAD-0009\.md has no "what would change my mind" clause/,
    /finds\/LEAD-0009\.md has no "three sentences" section/,
    /approve LEAD-0001 has no provenance tag/,
    /unknown verdict "\[bless\]"/,
    /a \[judgment\] preference cites no verdict/,
  ];
  for (const re of expect) assert.ok(errors.some((e) => re.test(e)), `missing: ${re}\n got:\n  ${errors.join('\n  ')}`);
  assert.equal(errors.length, expect.length, `unexpected extra errors:\n  ${errors.join('\n  ')}`);
});

test('the state list matches the RUNBOOK state machine', () => {
  for (const s of ['proposed', 'approved', 'digging', 'dug', 'revival candidate', 'barren', 'falsified', 'uncertain', 'synthesized', 'accepted', 'rejected', 'sent-back', 'quarantined']) assert.ok(STATES.includes(s), s);
});
