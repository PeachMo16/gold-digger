# A find should have a next use

The research library adds a local reuse loop to the mine. Ask a current question,
retrieve related past work, inspect a **proposed** use and bounded next test, and
bring it back for review when evidence changes. It uses Node's standard library:
no dependencies, credentials, model calls, database service or scheduled watcher.

```sh
npm run library -- ask "when is swarm coordination worth the cost"
npm run library -- ask "多智能体什么时候值得用"
npm run library -- show LEAD-0007
npm run library -- review
npm run library -- list --json
npm run demo:library
```

The demo creates an isolated temporary mine containing explicitly synthetic
research. It does not touch `data/`. The directory is printed so you can inspect
the saved card and event. No real scientific or commercial claim is made.

## What comes back

An answer includes the current queue state, matching terms, research files,
candidate application, prerequisites, conditions for rechecking, a proposed test,
its deliverable, pass/fail conditions and budget ceiling. It also exposes missing
cards, source changes, pending evidence events, and declared dependency changes.

Search is deterministic **topical overlap**, not semantic reasoning or a truth
score. Curated question/use fields have more weight than raw report text. Chinese
search uses adjacent-character pairs; add both English and Chinese questions to
a card for cross-language retrieval. It does not translate automatically. No
match is reported as no match. An uncatalogued report remains searchable, but
the tool does not invent an experiment for it.

Rejected leads are excluded from `ask` by default so an operator's declined
interests do not get silently re-proposed; use `--include-rejected` deliberately.
Falsified/barren/quarantined leads remain discoverable, explicitly labelled with
their state: a relevant death file may help kill a new bad idea. It is not an
endorsement or automatic reopening.

## Add an application card

```sh
node tools/library.mjs draft LEAD-0007 > /tmp/card.json
# Edit the draft, then:
node tools/library.mjs save /tmp/card.json
node tools/check.mjs data
```

A draft deliberately has empty fields and cannot be saved unchanged. The author
must supply the judgment; a schema cannot decide what a finding is worth.

```json
{
  "version": 1,
  "leadId": "LEAD-0007",
  "title": "A proposed application, not an earned result",
  "questions": ["Which current problem might this help?", "中文问题也可以"],
  "candidateUse": "A scoped application hypothesis tied to the existing research",
  "limitations": ["Unverified assumptions, unread sources and prior corrections"],
  "conditions": [{
    "id": "main-blocker",
    "description": "The prerequisite that must hold",
    "state": "unknown",
    "recheckWhen": "A concrete new measurement, paper or observation"
  }],
  "nextTest": {
    "action": "One bounded action that can distinguish the alternatives",
    "deliverable": "An inspectable result",
    "pass": "What result would support this scoped application",
    "fail": "What result would reject or narrow it",
    "budget": "A time, call, token or money ceiling; declare required approvals"
  },
  "sources": [{
    "path": "finds/LEAD-0007.md",
    "quote": "Replace this with an actual passage from the current file"
  }],
  "dependsOn": [],
  "reviewedEventIds": []
}
```

`conditions[].state` is `unknown`, `met` or `unmet`. These are the card author's
recorded assessments, not machine verdicts. `nextTest` is a proposed affordable
discriminator, not proof that it is globally the cheapest experiment. A passed
test supports only its declared scope; failed and inconclusive tests are kept.

Sources must be research files within the mine's `digs/`, `finds/`, `deaths/` or
`proposals/` directories. Each quote must actually occur in its file (whitespace
is normalized). Saving pins its SHA-256 and snapshots the lead's research and
declared dependencies. This checks **local provenance**, not whether a paper is
true or whether the quotation supports the claim. Preserve extract-level,
hearsay, corrections and transfer limitations in the card.

Saved cards live in `data/library/cards/`. Replaced cards are preserved in
`data/library/revisions/`. All remain in the git-ignored private mine. The CLI
never edits `queue.md`, `taste.md`, findings, deaths, or research reports.

## Record new evidence or a test outcome

First record the read/observation in a research file. Then prepare an event:

```json
{
  "version": 1,
  "id": "EV-cost-check-2026-09-04",
  "leadId": "LEAD-0007",
  "kind": "condition-change",
  "conditionId": "main-blocker",
  "summary": "Describe the new evidence and which prerequisite it may affect",
  "sources": [{"path": "digs/LEAD-0007.v1.md", "quote": "An actual passage"}]
}
```

```sh
node tools/library.mjs event /tmp/event.json
node tools/library.mjs review
```

Kinds are `support`, `challenge`, `condition-change`, and `test-result`.
Only `condition-change` takes `conditionId`, which must name a saved condition.
Only `test-result` takes `outcome`: `pass`, `fail`, or `inconclusive`.
Events are append-only and cannot overwrite an existing ID. A correction is a
new event, with its evidence. The observer's event is not an analyst ruling.

Review surfaces new events and changed/missing sources. A changed upstream lead
also surfaces the plans that explicitly name it in `dependsOn`; review needs
propagate transitively and cycles are rejected. This is **not** automatic
theorem-dependency discovery: undeclared dependencies are not inferred.

After rereading, revise the card and list the event IDs considered in
`reviewedEventIds`. Saving snapshots the reviewed state, preserves the previous
card and clears those event reminders. If a pinned source changed, saving with
its old SHA-256 fails: reread it, correct the quotation/plan, and remove that
source's old `sha256` before saving. An event whose own source has changed stays
flagged even if its ID was reviewed.

## Where the gates still apply

Creating, searching and revising these planning records does not spend a
research budget, dispatch a digger, validate an application, overturn a finding,
reopen a dead lead, or accept a discovery. A new dig still passes the approve
gate; synthesis still passes the accept gate. A death may have a tripwire that
routes evidence to an entirely **different** lead. Read the death's latest
analyst additions before deciding which path is appropriate.

The summarizer owns a card's proposed use/test content; the operator controls
the research decision. The CLI is the single storage writer for cards/events.
Observer roles may prepare an evidence event, but only the existing analyst and
human gate process can change a research conclusion. No background job was added.
