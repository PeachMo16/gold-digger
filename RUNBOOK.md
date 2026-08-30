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

## bootstrap

```
cp -r templates data
```

Templates ship empty with the right headers: `queue.md`, `taste.md`, and the
report skeletons (`dig.md`, `death.md`, `find.md`) that diggers, analysts, and
summarizers copy per lead. The `examples/` directory shows one lead of each fate,
end to end.
