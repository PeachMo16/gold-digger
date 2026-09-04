#!/usr/bin/env node
// gold-digger checker: does the mine obey its own rules?
// Reads a data/ directory (default ./data) and reports protocol violations. No model, no network.
//   node tools/check.mjs            # check ./data
//   node tools/check.mjs path/to/dir
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getLibrary } from './library-core.mjs';

export const STATES = [
  'proposed', 'approved', 'digging', 'dug', 'revival candidate', 'barren', 'falsified',
  'uncertain', 'synthesized', 'accepted', 'rejected', 'sent-back', 'quarantined',
];
const VERDICTS = ['approve', 'reject', 'accept', 'send-back', 'note'];

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const list = (dir) => (existsSync(dir) ? readdirSync(dir) : []);

export function check(root = 'data') {
  const errors = [], warnings = [];
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);

  // ── queue ──────────────────────────────────────────────────────────────
  const queue = read(join(root, 'queue.md'));
  const leads = [];
  if (queue == null) E(`queue.md missing in ${root}`);
  else {
    const seen = new Map();
    for (const [i, line] of queue.split('\n').entries()) {
      const m = line.match(/^- \[([^\]]+)\] (LEAD-\d{4})\b/);
      if (!m) continue;
      const [, status, id] = m;
      if (!STATES.includes(status)) E(`queue.md:${i + 1} ${id} has unknown status "[${status}]" (valid: ${STATES.join(', ')})`);
      if (seen.has(id)) E(`queue.md:${i + 1} ${id} appears twice (first at line ${seen.get(id)}) — one lead, one state`);
      seen.set(id, i + 1);
      leads.push({ id, status, line: i + 1 });
    }
  }

  // ── per-lead artifacts ─────────────────────────────────────────────────
  const digs = list(join(root, 'digs')), finds = list(join(root, 'finds')), deaths = list(join(root, 'deaths'));
  const proposals = list(join(root, 'proposals'));
  const belongsTo = (f, id) => f.endsWith('.md') && (f.startsWith(`${id}.`) || f.startsWith(`${id}-`));
  const has = (files, id, re = '') => files.some((f) => belongsTo(f, id) && new RegExp(re).test(f));
  // Dispatch logs document why work was assigned; they are not research evidence.
  // Keep numbered/lettered dig reports valid, including older multi-digger runs.
  const digReports = digs.filter((f) => !f.endsWith('.dispatch.md'));
  for (const { id, status } of leads) {
    const dug = ['dug', 'revival candidate', 'synthesized', 'accepted', 'sent-back', 'barren', 'falsified', 'uncertain'];
    if (['digging', ...dug].includes(status) && !has(digReports, id) && !has(deaths, id)) E(`${id} is [${status}] but has no dig report in digs/ (and no death file)`);
    if (['barren', 'falsified'].includes(status) && !has(deaths, id)) E(`${id} is [${status}] but has no death file in deaths/ — house rule 1: death files are mandatory`);
    if (['synthesized', 'accepted'].includes(status) && !has(finds, id)) E(`${id} is [${status}] but has no find in finds/`);
    if (status === 'accepted' && !has(finds, id)) continue;
    if (['digging', ...dug].includes(status) && !has(digs, id, '\\.dispatch\\.md$')) W(`${id} [${status}] has no dispatch record digs/${id}.dispatch.md (RUNBOOK rule since 2026-09-01; older leads exempt)`);
    if (status === 'proposed' && !has(proposals, id)) W(`${id} is [proposed] with no one-page proposal in proposals/`);
    if (status === 'uncertain') {
      const body = digReports.filter((f) => belongsTo(f, id)).map((f) => read(join(root, 'digs', f))).join('\n');
      if (!/what[- ]would[- ]resolve/i.test(body)) E(`${id} is [uncertain] but no dig report carries a what-would-resolve-this note`);
    }
  }
  for (const f of deaths) {
    const body = read(join(root, 'deaths', f)) ?? '';
    if (!/what would change (my|your) mind/i.test(body)) E(`deaths/${f} has no "what would change my mind" clause — a death file without a tripwire cannot reopen`);
  }
  for (const f of finds) {
    const body = read(join(root, 'finds', f)) ?? '';
    if (!/## three sentences/i.test(body)) E(`finds/${f} has no "three sentences" section — compression is the acceptance test`);
  }
  // verification-dig cap: two per lead
  const vcount = {};
  for (const f of digs) { const m = f.match(/^(LEAD-\d{4})\.v(\d+)\.md$/); if (m) vcount[m[1]] = Math.max(vcount[m[1]] ?? 0, +m[2]); }
  for (const [id, n] of Object.entries(vcount)) if (n > 2) E(`${id} has ${n} verification digs — cap is two, then the lead goes to [uncertain]`);

  // ── taste ──────────────────────────────────────────────────────────────
  const taste = read(join(root, 'taste.md'));
  const prov = { operator: 0, adopted: 0, untagged: 0 };
  if (taste == null) E(`taste.md missing in ${root}`);
  else {
    const lines = taste.split('\n');
    const logStart = lines.findIndex((l) => /^## verdict log/i.test(l));
    const logEnd = lines.findIndex((l, i) => i > logStart && /^## /.test(l));
    const log = lines.slice(logStart + 1, logEnd < 0 ? undefined : logEnd);
    // a verdict entry spans from its "- [verdict]" line to the next such line
    const entries = [];
    for (const l of log) {
      const m = l.match(/^- \[([a-z-]+)\] (LEAD-\d{4})/);
      if (m) entries.push({ verdict: m[1], id: m[2], text: l });
      else if (entries.length && l.trim() && !l.startsWith('<!--')) entries[entries.length - 1].text += ' ' + l.trim();
    }
    for (const e of entries) {
      if (!VERDICTS.includes(e.verdict)) E(`taste.md: unknown verdict "[${e.verdict}]" on ${e.id}`);
      if (e.verdict === 'note') continue;
      if (/·\s*operator\b/.test(e.text)) prov.operator++;
      else if (/·\s*adopted:\S+/.test(e.text)) prov.adopted++;
      else { prov.untagged++; E(`taste.md: ${e.verdict} ${e.id} has no provenance tag (· operator | · adopted:<who>) — protocol 03`); }
      if (!/"[^"]{2,}"|“[^”]{2,}”/.test(e.text)) W(`taste.md: ${e.verdict} ${e.id} has no quoted reason — logged as unexplained, carries no training weight`);
    }
    // inferred preferences span continuation lines too
    const prefs = [];
    for (const l of lines) {
      if (/^- \[(judgment|habit)/.test(l)) prefs.push(l);
      else if (prefs.length && /^\s+\S/.test(l)) prefs[prefs.length - 1] += ' ' + l.trim();
      else if (prefs.length && !l.trim()) prefs.push('');
    }
    for (const p of prefs.filter(Boolean)) if (/^- \[judgment/.test(p) && !/#\d|verdict|accept|approve|reject|send-back/i.test(p)) E(`taste.md: a [judgment] preference cites no verdict: "${p.slice(0, 70)}…"`);
  }

  if (existsSync(join(root, 'library'))) {
    try {
      for (const entry of getLibrary(root)) for (const reason of entry.reviewReasons) W(`library ${entry.leadId}: ${reason}`);
    } catch (error) { E(`library: ${error.message}`); }
  }
  const counts = Object.fromEntries(STATES.map((s) => [s, leads.filter((l) => l.status === s).length]).filter(([, n]) => n));
  return { errors, warnings, leads: leads.length, counts, provenance: prov };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ?? 'data';
  const r = check(root);
  console.log(`gold-digger check · ${root} · ${r.leads} leads · ${Object.entries(r.counts).map(([s, n]) => `${s}:${n}`).join(' ')}`);
  console.log(`taste provenance · operator:${r.provenance.operator} adopted:${r.provenance.adopted} untagged:${r.provenance.untagged}`);
  for (const w of r.warnings) console.log(`  W ${w}`);
  for (const e of r.errors) console.log(`  E ${e}`);
  console.log(r.errors.length ? `\n${r.errors.length} error(s), ${r.warnings.length} warning(s)` : `\nclean (${r.warnings.length} warning(s))`);
  process.exit(r.errors.length ? 1 : 0);
}
