# ⛏️ gold-digger

[![check](https://github.com/PeachMo16/gold-digger/actions/workflows/check.yml/badge.svg)](https://github.com/PeachMo16/gold-digger/actions/workflows/check.yml)

**Evidence-traced agent protocols for rediscovering overlooked research.**

Much of what science abandons was never disproven. It was set aside by timing,
ownership, fashion, or a badly-asked question — and those reasons expire, while
the papers don't. gold-digger is a set of protocols for agent pipelines that
re-read the discard pile, perform an autopsy on every find, and ask one question:

**Does the cause of death still hold?**

## a forty-year-old craft

This method has ancestors, and they should be named:

- **Don Swanson (1986)** — *undiscovered public knowledge*: one literature said
  Raynaud's patients have abnormally viscous blood; a disjoint literature said fish
  oil lowers blood viscosity; nobody had read both. Swanson connected them by reading
  alone; a 1989 controlled trial supported the hypothesis (for primary Raynaud's).
  His A–B–C model (A–B known, B–C known, A–C never connected → candidate hypothesis)
  is the oldest formal cross-domain discovery route on record, and the work later
  evolved into the Arrowsmith system (Swanson & Smalheiser, 1997).
- **Anthony van Raan (2004)** — *sleeping beauties*: papers that sleep uncited for
  decades and then wake. Later quantified at scale (Ke et al., PNAS 2015) with
  measurable criteria: depth of sleep, length of sleep, awakening intensity.
- **Genrich Altshuller (1950s)** — TRIZ: extracted reusable invention patterns from
  tens of thousands of patents, by hand.

What changed is not the method. **Reading became cheap.** Swanson had software but
no readers; agents are readers. This repo wires the old craft into modern agent
harnesses — Claude Code, Hermes, Codex, whatever you run. No framework, no lock-in:
the protocols are plain markdown briefs, orchestrated per [RUNBOOK.md](RUNBOOK.md).

## the pipeline

Six roles, two human gates. The gates are the machine's heart: they are where it
learns judgment, and they may not be routed around.

```
        scout ──► [APPROVE GATE] ──► diggers (parallel, disposable)
          ▲              │                    │
          │              ▼                    ▼
  blind-spot engine  taste keeper ◄──────  analyst ──► summarizer ──► [ACCEPT GATE]
  (asks questions)   (logs every verdict + reason)                        │
          ▲              ▲                                                │
          └──────────────┴────────── every gate verdict ◄─────────────────┘
```

| role | protocol | job |
|---|---|---|
| scout | [protocols/00-queue.md](protocols/00-queue.md) | keeps the domain queue, proposes digs, never digs |
| digger | [protocols/01-dig.md](protocols/01-dig.md) | excavates one lead, files a report with a *candidate* death explanation |
| analyst | [protocols/02-autopsy.md](protocols/02-autopsy.md) | rules on the death, runs the five-axis revival check and the smuggling check |
| taste keeper | [protocols/03-taste.md](protocols/03-taste.md) | turns every human verdict into an auditable taste file |
| blind-spot engine | [protocols/04-blindspot.md](protocols/04-blindspot.md) | finds structural holes in the taste — outputs questions, never verdicts |
| summarizer | [protocols/05-synthesis.md](protocols/05-synthesis.md) | compresses; compression is the acceptance test |

House rules binding every role: [protocols/06-gates.md](protocols/06-gates.md).
Orchestration — who loads what, the lead state machine, failure routing: [RUNBOOK.md](RUNBOOK.md).

## the autopsy

Research gets abandoned for reasons that have nothing to do with being wrong.
The analyst first classifies the historical cause of death:

| cause | what it looks like |
|---|---|
| **falsified** | actually disproven — case closed, death record filed |
| **timing** | right result, wrong decade: the compute/material/instrument didn't exist |
| **ownership** | sound research, wrong roadmap — corporate labs publish what they won't build |
| **framing** | good data hitched to a question nobody cared about |
| **ugly** | slow, unfashionable, badly written, buried venue |

History explains the past; it does not clear the future. A revival candidate must
then pass a **five-axis check** — one expired kill reason does not certify the
other four:

| axis | question |
|---|---|
| truth | refuted, retracted, or unreplicable? (terminal if failed) |
| feasibility | has the missing ingredient — compute, material, instrument — arrived? |
| safety | do safety, ethics, or regulation permit it now? |
| freedom | patents and rights: *candidate only; requires freedom-to-operate review* |
| value | is there a live question and real value today? |

Queue ordering carries an **old-and-uncited bonus**: low citations × high age ×
relevance to a live question. Shallow merit gets drained within a decade; whatever
is still lying there is either deeply right or rightly dead — the autopsy decides which.

## taste and blind spots

The approve gate is a training signal, not a rubber stamp. Every rejection and
approval is logged *with its reason*; over time the log becomes an auditable
version of the operator's judgment — that file is the asset, the crawler is a shovel.

Taste alone builds a faster copy of the operator, so a second engine inverts it.
The blind-spot engine looks for **structural holes** — not far land never visited,
but the step *adjacent to worked territory that is never taken* — and only ever asks:

> "You mined all of X's convergence results but never touched their reversibility
> work from the same years — pass, or never saw it?"

"Pass" (with reason) becomes recorded judgment. "Never saw it" becomes a lead.
The verdict on the operator's own blindness stays with the operator.

## honesty rules

Without these, an automated miner degrades into an automated hoarder:

- **Death files** — barren digs are reported, with a *what-would-change-my-mind*
  clause. A pipeline that only logs success learns to attempt only the easy.
- **Smuggling check** — any concept crossing a domain border is stopped and searched:
  same thing on both sides, or same spelling? Metaphors may travel if declared;
  theorems need visas.
- **Compression test** — a synthesis that can't survive being cut to three sentences
  goes back down. Length is not diligence.
- **Every claim traces to a read** — citation-of-citation is hearsay and is marked
  as such.

## worked examples

One real run and two known-answer tests:

- [examples/one-real-run/](examples/one-real-run/) — **a live find, published as-is**:
  1970s–80s blackboard systems (Hearsay-II, BB1) as unacknowledged prior art for
  2026 LLM swarm papers. Seven diggers across three architectures, every web claim
  labeled extract-level because fetching was denied, one load-bearing claim marked
  hearsay — and the single verification dig that later settled it first-hand
  (SwarmWorld's full text: zero blackboard citations). The find's own verdict on
  swarms is applied to the pipeline that produced it: one digger unless you can say
  why one session can't absorb the lead. Read it for the honesty machinery, not the
  history.
- [examples/one-real-run/LEAD-0005-death.md](examples/one-real-run/LEAD-0005-death.md)
  — **a real death file**: a lead spun off from an accepted find, dug by one digger
  in 35 tool calls, found to be mis-posed at birth (the primary source never made
  the claim), ruled *falsified* — and the correction it forced onto the earlier,
  already-accepted find. The word "neglected" got quarantined on the way out.

- [examples/one-successful-dig/](examples/one-successful-dig/) — Karikó & Weissman's
  2005 nucleoside-modification paper: desk-rejected by *Nature* in 24 hours as
  "not novel," under-funded for a decade, Nobel Prize 2023. Cause of death:
  framing + ugly. The feasibility and value axes flipped; the freedom axis shows
  why "public" ≠ "free to use."
- [examples/one-barren-dig/](examples/one-barren-dig/) — polywater (1962–1973):
  seductive anomaly, killed on the truth axis by a sweat-contamination analysis.
  A correct death, and a death file worth keeping.

## quick start

```
git clone https://github.com/PeachMo16/gold-digger && cd gold-digger
claude
> /dig "1970s control theory results that predate cheap sensors"
```

The repo ships a Claude Code skill, [`/dig`](.claude/skills/dig/SKILL.md), that
plays the head agent from [RUNBOOK.md](RUNBOOK.md): it bootstraps `data/` from
`templates/`, files your domain as a lead, writes the scout's one-page proposal —
and stops at the approve gate. `/dig LEAD-0001` advances a lead one state
(digger → analyst → summarizer), each role a fresh subagent with only its own
protocol; `/dig status` prints the queue. Other harnesses: follow the RUNBOOK by hand,
the protocols are plain markdown.
The repo ships the empty machine; everything it eats and produces stays in `data/`,
which is git-ignored by default — see the privacy note in the house rules.

## the checker

The protocols are prose, and prose drifts. `tools/check.mjs` reads a mine and
reports where it breaks its own rules — a
lead in two states, a `[falsified]` lead with no death file, a death file with no
*what-would-change-my-mind* clause, a find with no three sentences, more than two
verification digs, a gate verdict with no reason or no provenance, a `[judgment]`
tag that cites no verdict. Dispatch logs cannot stand in for research reports or
resolution notes, and artifacts must belong to the exact lead ID being checked.
No model, no network, milliseconds.

```
node tools/check.mjs data      # your mine
npm test                       # the checker against its fixtures + the empty templates
```

The `/dig` skill runs it after every write. CI runs it on the shipped templates, so
an empty mine is always a valid mine.

## after the find: a reusable research library

A find can now carry a candidate use, explicit prerequisites, and one proposed
next test with a deliverable, pass/fail criteria and a budget ceiling. Search
your existing mine in English or Chinese; uncatalogued Markdown remains
searchable without pretending an application has been validated.

```
npm run library -- ask "when is swarm coordination worth the cost"
npm run library -- ask "多智能体什么时候值得用"
npm run library -- show LEAD-0007
npm run library -- review
npm run demo:library
```

Cards pin quoted local evidence. New support, challenges, changed conditions
and test outcomes can be recorded as append-only events. Source edits and
declared upstream dependencies bring affected plans back for review. Old card
versions survive. Nothing automatically reopens a lead or passes a human gate.

The library is local, deterministic and dependency-free. Retrieval measures
topical overlap, not truth or semantic equivalence; a proposed test is not an
earned finding. All real cards and events stay in private `data/`. The shipped
demo is explicitly synthetic. See [LIBRARY.md](LIBRARY.md) for authoring cards,
recording events, handling corrections and the current limits.

## honest limitations

- Every run so far — three finds, one death, one self-correction — was by the same
  operator and the same head. Nobody outside has cloned this and dug a domain end
  to end; until someone does, "it works" means "it worked for us".
- Interestingness is not automated — it is learned from the operator, slowly,
  through the gates. Skip the approvals and you get a very diligent hoarder.
- The autopsy taxonomy and five axes are hand-made reading discipline, not a
  validated instrument.
- The freedom axis flags questions; it is not legal advice. Anything headed toward
  commercial use needs a real freedom-to-operate review.
- Blind-spot questions are only as good as the verdict history behind them.
  Thin history, dumb questions.
- The reuse library tracks only explicitly declared dependencies. It cannot
  independently validate a paper, infer a cross-domain transfer, find the
  cheapest possible experiment, or predict commercial success.

## provenance

Idea: [PeachMo16](https://github.com/PeachMo16). Built: Claude. Audited: Codex —
including the review that caught this README overclaiming its own citations,
which is the failure mode the whole pipeline exists to prevent. The pattern comes
from the same observation behind [uncle-watch](https://github.com/PeachMo16/uncle-watch):
learn a system's routine, then read the deviations — the value is always in the gap.

And yes, the name is both kinds of gold digger. We're told the polite term is
*sleeping-beauty revival*. We kept ours.

## references

- Swanson, D.R. (1986). [Fish oil, Raynaud's syndrome, and undiscovered public knowledge](https://pubmed.ncbi.nlm.nih.gov/3797213/). *Perspectives in Biology and Medicine*.
- DiGiacomo, R. et al. (1989). [Fish-oil dietary supplementation in patients with Raynaud's phenomenon](https://pubmed.ncbi.nlm.nih.gov/2536517/). *Am J Med*.
- Swanson, D.R. & Smalheiser, N.R. (1997). [An interactive system for finding complementary literatures](https://www.sciencedirect.com/science/article/pii/S0004370297000088). *Artificial Intelligence*.
- van Raan, A.F.J. (2004). Sleeping Beauties in science. *Scientometrics* 59:467–472.
- Ke, Q. et al. (2015). [Defining and identifying Sleeping Beauties in science](https://www.pnas.org/doi/10.1073/pnas.1424329112). *PNAS*.
- WIPO, [Inventions in the public domain / freedom-to-operate guidance](https://www.wipo.int/en/web/tisc/inventions-public-domain).
- Example citations live inside each example directory.

## license

MIT
