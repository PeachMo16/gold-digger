import test from 'node:test';
import assert from 'node:assert/strict';
import { check, STATES } from './check.mjs';

const fx = (n) => new URL(`./fixtures/${n}/`, import.meta.url).pathname;

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
