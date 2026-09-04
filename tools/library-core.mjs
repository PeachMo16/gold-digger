// Local, evidence-linked research reuse. No model calls and no gate mutations.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

const LEAD = /^LEAD-\d{4}$/;
const EVENT = /^EV-[a-zA-Z0-9-]+$/;
const STATES = new Set(['proposed', 'approved', 'digging', 'dug', 'revival candidate', 'barren', 'falsified', 'uncertain', 'synthesized', 'accepted', 'rejected', 'sent-back', 'quarantined']);
const hash = (text) => createHash('sha256').update(text).digest('hex');
const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const files = (path) => existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort() : [];
const fail = (message) => { throw new Error(message); };
const text = (value, name) => typeof value === 'string' && value.trim() ? value : fail(`${name} must be nonempty text`);
const array = (value, name) => Array.isArray(value) ? value : fail(`${name} must be an array`);
const oneOf = (value, values, name) => values.includes(value) ? value : fail(`${name} must be ${values.join(' | ')}`);
const normalize = (value) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();

function fields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${label}: unknown field ${key}`);
}

function within(root, path) {
  const rel = relative(realpathSync(root), realpathSync(path));
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`path escapes mine: ${path}`);
  return path;
}

function sourceFile(root, name) {
  text(name, 'source.path');
  if (isAbsolute(name) || name.split(/[\\/]/).some((p) => p === '..' || p.startsWith('.')) ||
      !/^(digs|finds|deaths|proposals)\/.+\.(md|txt|json)$/.test(name)) {
    fail(`source must be a relative research file under digs/, finds/, deaths/ or proposals/: ${name}`);
  }
  const path = resolve(root, name);
  if (!existsSync(path)) fail(`source missing: ${name}`);
  return within(root, path);
}

function pinSource(root, source) {
  fields(source, ['path', 'quote', 'sha256'], 'source');
  const body = read(sourceFile(root, source.path));
  const quote = text(source.quote, 'source.quote');
  if (!normalize(body).includes(normalize(quote))) fail(`quoted evidence not found in ${source.path}`);
  const digest = hash(body);
  if (source.sha256 && source.sha256 !== digest) fail(`source changed: ${source.path}; reread it before removing the old sha256 and saving a new revision`);
  return { path: source.path, quote, sha256: digest };
}

export function readLeads(root) {
  const leads = new Map();
  const path = join(root, 'queue.md');
  if (!existsSync(path)) fail(`queue.md missing in ${root}`);
  for (const line of read(path).split('\n')) {
    const m = line.match(/^- \[([^\]]+)\] (LEAD-\d{4})\b(.*)$/);
    if (!m) continue;
    if (!STATES.has(m[1])) fail(`${m[2]} has unknown queue state ${m[1]}`);
    if (leads.has(m[2])) fail(`${m[2]} appears twice in queue.md`);
    leads.set(m[2], { leadId: m[2], status: m[1], description: m[3].replace(/^\s*·\s*/, ''), documents: [] });
  }
  for (const dir of ['finds', 'deaths', 'digs', 'proposals']) {
    for (const name of files(join(root, dir))) {
      if (!name.endsWith('.md') || /\.(dispatch|ruling)\.md$/.test(name)) continue;
      const id = name.match(/^(LEAD-\d{4})(?=[.-])/i)?.[1];
      if (!leads.has(id)) continue;
      const path = within(root, join(root, dir, name));
      const body = read(path);
      leads.get(id).documents.push({ path: `${dir}/${name}`, text: body, sha256: hash(body) });
    }
  }
  return leads;
}

function loadRecords(root, folder, pattern) {
  const records = [];
  for (const name of files(join(root, 'library', folder))) {
    if (!name.endsWith('.json')) continue;
    if (!pattern.test(name)) fail(`unexpected library filename: ${folder}/${name}`);
    const record = json(within(root, join(root, 'library', folder, name)));
    const id = folder === 'cards' ? record.leadId : record.id;
    if (`${id}.json` !== name) fail(`record ID does not match filename: ${folder}/${name}`);
    records.push(record);
  }
  return records;
}

function digestLead(lead) {
  return hash(JSON.stringify({ status: lead.status, description: lead.description,
    documents: lead.documents.map(({ path, sha256 }) => ({ path, sha256 })) }));
}

function validateCard(card) {
  fields(card, ['version', 'leadId', 'title', 'questions', 'candidateUse', 'limitations', 'conditions', 'nextTest', 'sources', 'dependsOn', 'reviewedEventIds', 'updatedAt', 'dependencySnapshots', 'leadSnapshot'], 'card');
  if (card.version !== 1 || !LEAD.test(card.leadId)) fail('card requires version: 1 and a LEAD-0000 ID');
  text(card.title, 'title'); text(card.candidateUse, 'candidateUse');
  for (const key of ['questions', 'limitations']) {
    if (!array(card[key], key).length) fail(`${key} must not be empty`);
    card[key].forEach((v) => text(v, key));
  }
  const ids = new Set();
  for (const c of array(card.conditions, 'conditions')) {
    fields(c, ['id', 'description', 'state', 'recheckWhen'], 'condition');
    if (!/^[a-z][a-z0-9-]*$/.test(c.id) || ids.has(c.id)) fail('condition IDs must be unique lowercase identifiers');
    ids.add(c.id); text(c.description, 'condition.description'); text(c.recheckWhen, 'condition.recheckWhen');
    oneOf(c.state, ['unknown', 'met', 'unmet'], 'condition.state');
  }
  fields(card.nextTest, ['action', 'deliverable', 'pass', 'fail', 'budget'], 'nextTest');
  for (const key of ['action', 'deliverable', 'pass', 'fail', 'budget']) text(card.nextTest[key], `nextTest.${key}`);
  if (!array(card.sources, 'sources').length) fail('at least one source quote is required');
  for (const s of card.sources) {
    fields(s, ['path', 'quote', 'sha256'], 'source'); text(s.path, 'source.path'); text(s.quote, 'source.quote');
  }
  for (const id of array(card.dependsOn ?? [], 'dependsOn')) if (!LEAD.test(id) || id === card.leadId) fail(`invalid dependency ${id}`);
  for (const id of array(card.reviewedEventIds ?? [], 'reviewedEventIds')) if (!EVENT.test(id)) fail(`invalid event ID ${id}`);
}

function validateEvent(event, cards) {
  fields(event, ['version', 'id', 'leadId', 'kind', 'summary', 'sources', 'conditionId', 'outcome', 'recordedAt'], 'event');
  if (event.version !== 1 || !EVENT.test(event.id) || !LEAD.test(event.leadId)) fail('event requires version: 1, an EV- identifier and a LEAD-0000 ID');
  oneOf(event.kind, ['support', 'challenge', 'condition-change', 'test-result'], 'event.kind');
  text(event.summary, 'event.summary');
  if (!array(event.sources, 'event.sources').length) fail('an event requires source evidence');
  if (event.kind === 'condition-change') {
    if (!cards.get(event.leadId)?.conditions.some((c) => c.id === event.conditionId)) fail(`unknown condition ${event.conditionId} on ${event.leadId}`);
  } else if (event.conditionId !== undefined) fail('conditionId belongs only to condition-change events');
  if (event.kind === 'test-result') oneOf(event.outcome, ['pass', 'fail', 'inconclusive'], 'event.outcome');
  else if (event.outcome !== undefined) fail('outcome belongs only to test-result events');
}

function assertNoCycles(cards) {
  const visited = new Set(), active = new Set();
  function visit(id) {
    if (active.has(id)) fail(`dependency cycle at ${id}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const dep of cards.get(id)?.dependsOn ?? []) visit(dep);
    active.delete(id); visited.add(id);
  }
  for (const id of cards.keys()) visit(id);
}

function writeRecord(root, folder, name, record, exclusive = false) {
  const dir = join(root, 'library', folder);
  mkdirSync(dir, { recursive: true, mode: 0o700 }); within(root, dir);
  const target = join(dir, name);
  const body = JSON.stringify(record, null, 2) + '\n';
  if (exclusive) writeFileSync(target, body, { flag: 'wx', mode: 0o600 });
  else {
    if (existsSync(target)) within(root, target);
    const tmp = join(dir, `.${name}.${randomUUID()}.tmp`);
    writeFileSync(tmp, body, { flag: 'wx', mode: 0o600 }); renameSync(tmp, target);
  }
}

export function saveCard(root, input) {
  validateCard(input);
  const leads = readLeads(root);
  if (!leads.has(input.leadId)) fail(`unknown lead ${input.leadId}`);
  const cards = new Map(loadRecords(root, 'cards', /^LEAD-\d{4}\.json$/).map((c) => [c.leadId, c]));
  const events = loadRecords(root, 'events', /^EV-[a-zA-Z0-9-]+\.json$/);
  const dependencies = [...new Set(input.dependsOn ?? [])];
  for (const id of dependencies) if (!leads.has(id)) fail(`unknown dependency ${id}`);
  for (const id of input.reviewedEventIds ?? []) if (!events.some((e) => e.id === id && e.leadId === input.leadId)) fail(`event ${id} does not belong to ${input.leadId}`);
  const card = { ...input, dependsOn: dependencies, reviewedEventIds: input.reviewedEventIds ?? [],
    sources: input.sources.map((s) => pinSource(root, s)), updatedAt: new Date().toISOString(),
    leadSnapshot: digestLead(leads.get(input.leadId)),
    dependencySnapshots: Object.fromEntries(dependencies.map((id) => [id, digestLead(leads.get(id))])) };
  cards.set(card.leadId, card); assertNoCycles(cards);
  // Save old versions separately; queue/taste/finds are never written by this tool.
  const current = join(root, 'library/cards', `${card.leadId}.json`);
  if (existsSync(current)) writeRecord(root, 'revisions', `${card.leadId}-${randomUUID()}.json`, json(within(root, current)), true);
  writeRecord(root, 'cards', `${card.leadId}.json`, card);
  return card;
}

export function recordEvent(root, input) {
  const cards = new Map(loadRecords(root, 'cards', /^LEAD-\d{4}\.json$/).map((c) => [c.leadId, c]));
  validateEvent(input, cards);
  if (!readLeads(root).has(input.leadId)) fail(`unknown lead ${input.leadId}`);
  const event = { ...input, recordedAt: new Date().toISOString(), sources: input.sources.map((s) => pinSource(root, s)) };
  writeRecord(root, 'events', `${event.id}.json`, event, true);
  return event;
}

function sourceIssues(root, sources, label) {
  const issues = [];
  for (const s of sources) {
    try {
      if (!/^[a-f0-9]{64}$/.test(s.sha256 ?? '')) fail('missing source snapshot; use library save/event');
      const body = read(sourceFile(root, s.path));
      if (hash(body) !== s.sha256) issues.push(`${label}: source changed: ${s.path}`);
      if (!normalize(body).includes(normalize(text(s.quote, 'source.quote')))) issues.push(`${label}: quote no longer present: ${s.path}`);
    } catch (error) { issues.push(`${label}: ${error.message}`); }
  }
  return issues;
}

export function getLibrary(root) {
  const leads = readLeads(root);
  const cards = new Map(loadRecords(root, 'cards', /^LEAD-\d{4}\.json$/).map((c) => { validateCard(c); return [c.leadId, c]; }));
  const events = loadRecords(root, 'events', /^EV-[a-zA-Z0-9-]+\.json$/);
  assertNoCycles(cards);
  for (const c of cards.values()) if (!leads.has(c.leadId)) fail(`unknown card lead ${c.leadId}`);
  for (const e of events) { validateEvent(e, cards); if (!leads.has(e.leadId)) fail(`unknown event lead ${e.leadId}`); }
  const entries = [];
  for (const lead of leads.values()) {
    const card = cards.get(lead.leadId) ?? null;
    const ownEvents = events.filter((e) => e.leadId === lead.leadId);
    const reviewReasons = card ? sourceIssues(root, card.sources, 'card') : [];
    if (card && card.leadSnapshot !== digestLead(lead)) reviewReasons.push('lead state or research documents changed since the plan was saved');
    for (const event of ownEvents) {
      if (!(card?.reviewedEventIds ?? []).includes(event.id)) reviewReasons.push(`new ${event.kind}: ${event.id} — ${event.summary}`);
      reviewReasons.push(...sourceIssues(root, event.sources, event.id));
    }
    for (const id of card?.dependsOn ?? []) {
      if (!leads.has(id)) reviewReasons.push(`dependency missing: ${id}`);
      else if (card.dependencySnapshots?.[id] !== digestLead(leads.get(id))) reviewReasons.push(`dependency research changed: ${id}`);
    }
    entries.push({ ...lead, card, events: ownEvents, reviewReasons, needsReview: reviewReasons.length > 0 });
  }
  // Propagate review needs, never truth verdicts, through explicitly declared dependencies.
  for (let pass = 0; pass < entries.length; pass++) {
    let changed = false;
    for (const entry of entries) for (const id of entry.card?.dependsOn ?? []) {
      const reason = `dependency needs review: ${id}`;
      if (entries.find((e) => e.leadId === id)?.needsReview && !entry.reviewReasons.includes(reason)) {
        entry.reviewReasons.push(reason); entry.needsReview = true; changed = true;
      }
    }
    if (!changed) break;
  }
  return entries;
}

const stopwords = new Set('a an the and or of to for in on is are was were with how what can could would should my our this that it use help find research'.split(' '));
function tokens(query) {
  const value = query.normalize('NFKC').toLowerCase();
  const words = value.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  const out = [];
  for (const word of words) {
    if (/\p{Script=Han}/u.test(word)) {
      const chars = [...word];
      for (let i = 0; i < chars.length - 1; i++) out.push(chars.slice(i, i + 2).join(''));
      if (chars.length === 1) out.push(word);
    } else if (word.length > 1 && !stopwords.has(word)) out.push(word);
  }
  return [...new Set(out)];
}

export function askLibrary(root, query, { limit = 3, includeRejected = false } = {}) {
  text(query, 'question');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) fail('limit must be an integer from 1 to 50');
  const terms = tokens(query);
  const rows = [];
  for (const entry of getLibrary(root)) {
    if (entry.status === 'rejected' && !includeRejected) continue;
    const c = entry.card;
    const fields = [
      { name: 'questions/use', weight: 4, value: c ? [c.title, ...c.questions, c.candidateUse].join(' ') : '' },
      { name: 'conditions/test', weight: 3, value: c ? JSON.stringify([c.conditions, c.nextTest]) : '' },
      { name: 'queue', weight: 2, value: entry.description },
      { name: 'research', weight: 1, value: entry.documents.map((d) => d.text).join('\n') },
      { name: 'events', weight: 2, value: entry.events.map((e) => e.summary).join(' ') },
    ].map((f) => ({ ...f, value: f.value.normalize('NFKC').toLowerCase() }));
    const matched = terms.map((term) => ({ term, fields: fields.filter((f) => f.value.includes(term)).map(({ name, weight }) => ({ name, weight })) })).filter((m) => m.fields.length);
    const score = matched.reduce((sum, m) => sum + Math.max(...m.fields.map((f) => f.weight)), 0);
    if (score) rows.push({ ...entry, match: { score, terms: matched.map((m) => m.term), fields: [...new Set(matched.flatMap((m) => m.fields.map((f) => f.name)))] } });
  }
  return rows.sort((a, b) => b.match.score - a.match.score || a.leadId.localeCompare(b.leadId)).slice(0, limit);
}

export function draftCard(root, leadId) {
  const lead = readLeads(root).get(leadId);
  if (!lead) fail(`unknown lead ${leadId}`);
  return { version: 1, leadId, title: '', questions: [''], candidateUse: '', limitations: [''],
    conditions: [{ id: 'main-blocker', description: '', state: 'unknown', recheckWhen: '' }],
    nextTest: { action: '', deliverable: '', pass: '', fail: '', budget: '' },
    sources: [{ path: lead.documents[0]?.path ?? `digs/${leadId}.md`, quote: '' }], dependsOn: [], reviewedEventIds: [] };
}
