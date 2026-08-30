# 06 · house rules: what binds every role

These are not per-role instructions; they bind everyone, always. Without them an
automated miner degrades into an automated hoarder — busier, not smarter.

## 1 · death files are mandatory

Barren digs, overturned finds, and refuted leads all get written down in
`data/deaths/` with *what would change your mind*. Three reasons:
- a pipeline that only records success learns to attempt only the easy
- other people's death files are the mine itself — the whole premise is
  "someone's discard pile, plus the question: did it deserve to die?" Extend
  your own the same courtesy
- a death file with a "what would change my mind" clause is a tripwire — checked
  by the scout whenever a related lead enters the queue (event-driven; nothing in
  this pipeline watches a clock), and that is how a dead lead reopens

## 2 · nothing crosses a border undeclared

The smuggling check (protocol 02) applies to *every* role, including the scout's
proposals and the summarizer's phrasing. Same spelling is not same meaning.
Metaphors may travel with papers; theorems need visas.

## 3 · compression is acceptance

Any role's output that can't be compressed to its three-sentence core goes back
to that role. Length is not diligence.

## 4 · the human gates are load-bearing

Two gates: approve (before digging) and accept (after synthesis). No role may
route around them, batch them into rubber stamps, or proceed on "they'll probably
approve." The gates are where the machine learns taste; skipping them doesn't
speed the machine up, it makes it dig randomly at scale.

## 5 · gate-triggered, not calendar-triggered

The pipeline wakes on events (new lead, new find, accumulated deaths, answered
blind-spot question), never on a schedule. A machine that runs to look busy
produces output to look busy.

## 6 · every claim traces to a read

"The source says" requires having read the source, this run, by some role, with
the quote in a report. Citation-of-citation is hearsay; mark it as such. This is
the same discipline as forensic tooling anywhere: every score traces to a filing.

## 7 · privacy line

The repo ships the empty machine. The queue's contents, the taste file, verdict
logs, digs, deaths, finds — everything in `data/` — is the operator's private
mine: git-ignored and never committed by default. Note what a .gitignore cannot
promise: a cloud-hosted harness may still send context to its provider — review
your harness's data policy before mining anything sensitive. Ship shovels, not maps.
