# RUNBOOK — orchestration

The protocols describe roles; this file describes the machine. Load order, state
machine, routing, failure paths. The head agent reads this file; subagents do not.

## who loads what

Loading every protocol into one context creates six agents arguing in one skull.
Don't. The rule: **one context, one role.**

| context | loads |
|---|---|
| head agent (orchestrator) | RUNBOOK.md + protocols/06-gates.md + data/queue.md |
| scout | 00-queue.md + 06-gates.md + data/queue.md + data/taste.md |
| digger (one per lead) | 01-dig.md + 06-gates.md + its one approved lead |
| analyst | 02-autopsy.md + 06-gates.md + the dig report under review |
| taste keeper | 03-taste.md + data/taste.md + the new verdict |
| blind-spot engine | 04-blindspot.md + data/taste.md + data/digs/ index |
| summarizer | 05-synthesis.md + 06-gates.md + the ruled dig report |

The head agent is a state machine and dispatcher. It holds no opinions about
finds; it moves leads between states and spawns the right role with the right
files. In Claude Code terms: head = the main session, roles = subagents launched
with only their own brief.

## lead state machine

```
proposed ──[human approves]──► approved ──► digging ──► dug
    │                                                    │
    └─[human rejects]──► rejected                     [analyst rules]
                                                         │
              ┌──────────────┬───────────────────────────┤
              ▼              ▼                           ▼
           barren        falsified                 revival candidate
        (death file)   (death file)                      │
              ▼              ▼                           ▼
           parked         closed                    synthesized
                                                         │
                                              [human: accept gate]
                                              ┌──────────┼──────────┐
                                              ▼          ▼          ▼
                                          accepted   rejected   sent-back ──► digging
```

Additional terminal-ish states:
- **uncertain** — the analyst cannot rule (digger filed `unknown`, verification
  failed to settle it). The lead parks with an explicit *what-would-resolve-this*
  note. Not a failure; an honest ledger entry.
- **quarantined** — a concept that failed the smuggling check; usable as a
  declared metaphor only.

## writes and ownership

One writer per file, no exceptions:
- `data/queue.md` — scout only (head may flip statuses it owns: digging, dug)
- `data/digs/LEAD-ID.md` — the digger creates; the analyst *appends* rulings
- `data/deaths/` — diggers (barren) and analyst (falsified)
- `data/taste.md` — taste keeper only
- `data/finds/` — summarizer only

## reading the sources

Rule 6 of the house rules (every claim traces to a read) is only satisfiable if diggers
can actually read. The head must confirm, *before spawning*, that a digger's context
can fetch web pages and open PDFs; a dig run where every citation is "extract-level"
because fetching was denied is not a dig, it is a search-results summary, and should
be labeled as such in the report header. Practical notes for a Claude Code harness:
- `WebFetch` needs the domain allow-listed (arxiv.org, pmc.ncbi.nlm.nih.gov,
  academic.oup.com, publisher domains); a digger subagent inherits the session's
  permissions, so grant them in the head session first, not mid-dig.
- PDFs: don't report "no local renderer" — `python3 -c "import pypdf"` is enough to
  extract text from most journal PDFs; download with `curl`, extract, then read.
- Every dig report states, in its header, which sources were read first-hand this
  run and which stayed extract-level. Extract-level claims may not become verdicts.

## before spending more than one context (from LEAD-0007, accepted 2026-09-01)

The blackboard dig's own finding, applied to itself: coordination flexibility costs
about 2x per unit of output and pays only where the task exceeds one integrated
system. So:

- **Harpy-redux check** — no lead gets more than one digger unless the head writes,
  on the record at approval time, one line saying why the lead exceeds what a single
  session can absorb. No line, one digger.
- **Dispatch reasoning on the record** — whenever the head spawns a role, it appends
  to `data/digs/LEAD-ID.dispatch.md` what it spawned, with which files, and why. Gates
  may audit why a dig was commissioned, not just what it found.
- **Per-lead budget** — the head sets a step budget (tool calls, or tokens where the
  harness reports them) per lead at approval; exceeding it parks the lead as
  `uncertain` with a what-would-resolve note, same as the verification-dig cap.
- **The head stays dumb** — it dispatches and moves states; it does not rank finds,
  and it does not become a scheduler with opinions. The operator plus the taste file
  is the control layer. Automating that layer is re-running 1985 with worse unit
  economics.

## verification digs

The analyst adds no evidence itself. When a ruling needs a fact checked (does the
refutation hold? has the missing instrument arrived?), the analyst asks the head
to spawn a **verification dig**: a digger run scoped to one narrow question, filed
as `data/digs/LEAD-ID.v1.md`. Cap: two verification digs per lead, then the lead
goes to `uncertain` rather than looping.

## triggers

Event-driven, not calendar-driven:
- lead enters queue → scout wakes
- human approves → head spawns digger(s)
- dig report filed → head spawns analyst
- ruling filed → head spawns summarizer (revival) or files death (barren/falsified)
- any gate verdict → taste keeper wakes; blind-spot engine may ask its one question
- **death-file tripwires**: when a *new lead in a related area* enters the queue,
  the scout re-reads nearby death files' what-would-change-my-mind clauses. That
  is how a death file "reopens" — checked at events, not by a watcher on a clock.

## reuse an existing find before another dig

The local research library implements the procedural part of reuse. At a new
question, run `node tools/library.mjs ask "the question"`; inspect the sources,
current queue states, candidate applications, blockers and proposed tests.
Topical matches are not rankings of scientific merit. Rejected interests stay
out of results unless explicitly requested with `--include-rejected`.

The summarizer may prepare an application card using `library draft` and
`library save` (contract in `LIBRARY.md`). This preserves planning hypotheses
separately from findings and analyst rulings. A card records a bounded test;
it neither authorizes nor runs one. Existing approve/accept gates still apply.

When an observer reads new evidence or records a test outcome, prepare an event
and use `library event`. `library review` surfaces pending events, changed
sources and affected explicit dependencies. The analyst determines what the
evidence changes; the human gate remains authoritative. A tripwire may require
a new lead rather than reopening the old one. Never let the CLI infer that choice.

The CLI is the only writer of `data/library/{cards,events,revisions}/`. It pins
local source quotes and hashes, retains replaced cards, and never modifies the
queue, taste file or original research. No scheduled watcher is needed.

## bootstrap

```
cp -r templates data
```

Templates ship empty with the right headers: `queue.md`, `taste.md`, and the
report skeletons (`dig.md`, `death.md`, `find.md`) that diggers, analysts, and
summarizers copy per lead. The `examples/` directory shows one lead of each fate,
end to end.
