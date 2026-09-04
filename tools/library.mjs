#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { askLibrary, draftCard, getLibrary, recordEvent, saveCard } from './library-core.mjs';

const HELP = `gold-digger library — turn previous research into proposed next steps

  node tools/library.mjs list
  node tools/library.mjs ask "your current problem" [--limit 3] [--include-rejected]
  node tools/library.mjs show LEAD-0001
  node tools/library.mjs draft LEAD-0001 > /tmp/card.json
  node tools/library.mjs save /tmp/card.json
  node tools/library.mjs event /tmp/event.json
  node tools/library.mjs review

All commands support --root <mine> (default data) and --json.
Reading/searching never calls a model, fetches the web, or changes research verdicts.
Cards are planning hypotheses; source matches and test outcomes are not validation.
See LIBRARY.md for the card/event contract and a runnable synthetic demo.`;

function compact(entry) {
  const { documents, ...rest } = entry;
  return { ...rest, documents: documents.map(({ path, sha256 }) => ({ path, sha256 })) };
}

function describe(entry, detailed = true) {
  const c = entry.card;
  console.log(`\n${entry.leadId} [${entry.status}] ${c?.title ?? entry.description}`);
  if (entry.match) console.log(`  Matched: ${entry.match.terms.join(', ')} (${entry.match.fields.join('; ')}; topical overlap only)`);
  if (['falsified', 'barren', 'quarantined', 'rejected'].includes(entry.status)) console.log(`  Historical ${entry.status} lead. Relevance is a reason to reread, not a reopening or recommendation.`);
  if (entry.needsReview) for (const reason of entry.reviewReasons) console.log(`  REVIEW: ${reason}`);
  if (!detailed) return;
  if (c) {
    console.log(`  Candidate use (hypothesis): ${c.candidateUse}`);
    for (const condition of c.conditions) {
      console.log(`  Condition [${condition.state}]: ${condition.description}`);
      console.log(`    Recheck when: ${condition.recheckWhen}`);
    }
    console.log(`  Proposed next test: ${c.nextTest.action}`);
    console.log(`    Deliverable: ${c.nextTest.deliverable}\n    Pass: ${c.nextTest.pass}\n    Fail: ${c.nextTest.fail}\n    Budget ceiling: ${c.nextTest.budget}`);
    for (const hole of c.limitations) console.log(`  Limit: ${hole}`);
    for (const source of c.sources) console.log(`  Evidence: ${source.path}\n    “${source.quote}”`);
  } else {
    console.log('  No curated use/test card yet. Read the source; no experiment was invented from a search match.');
  }
  for (const event of entry.events) console.log(`  Event ${event.id}: ${event.kind}${event.outcome ? ` / ${event.outcome}` : ''} — ${event.summary}`);
  console.log(`  Research: ${entry.documents.map((d) => d.path).join(', ') || '(none)'}`);
  console.log('  Next step requires the existing approve/accept gates where applicable. Nothing was dispatched.');
}

export function main(argv = process.argv.slice(2)) {
  const positional = [], options = { root: 'data', limit: 3, json: false, includeRejected: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--include-rejected') options.includeRejected = true;
    else if (['--root', '--limit'].includes(arg)) {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--root') options.root = value; else options.limit = Number(value);
    } else if (arg.startsWith('--') && arg !== '--help') throw new Error(`unknown option ${arg}`);
    else positional.push(arg);
  }
  const [command, arg] = positional;
  if (!command || command === '--help' || command === 'help') return console.log(HELP);
  if (positional.length > 2) throw new Error('quote the question or path as one argument');
  const root = resolve(options.root);
  let result;
  if (command === 'ask') result = askLibrary(root, arg, options).map(compact);
  else if (command === 'list') result = getLibrary(root).map(compact);
  else if (command === 'review') result = getLibrary(root).filter((e) => e.needsReview).map(compact);
  else if (command === 'show') {
    const entry = getLibrary(root).find((e) => e.leadId === arg);
    if (!entry) throw new Error(`unknown lead ${arg}`);
    result = compact(entry);
  } else if (command === 'draft') return console.log(JSON.stringify(draftCard(root, arg), null, 2));
  else if (command === 'save' || command === 'event') {
    if (!arg) throw new Error(`${command} requires a JSON file`);
    const input = JSON.parse(readFileSync(arg, 'utf8'));
    result = command === 'save' ? saveCard(root, input) : recordEvent(root, input);
    if (!options.json) return console.log(`${command === 'save' ? 'Saved planning card' : 'Recorded evidence event'}: ${result.leadId}${result.id ? ` / ${result.id}` : ''}. Research verdicts unchanged.`);
  } else throw new Error(`unknown command ${command}; use --help`);
  if (options.json) return console.log(JSON.stringify(result, null, 2));
  if (!Array.isArray(result)) return describe(result);
  if (!result.length) return console.log(command === 'review' ? 'No evidence changes awaiting review.' : 'No matches. Try another term or add a curated card; this search does not infer semantic equivalence.');
  for (const entry of result) describe(entry, command !== 'list');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(`library: ${error.message}`); process.exitCode = 1; }
}
