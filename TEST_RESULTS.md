# Test results -- volleyball-scorer-bd (factory run, 2026-11-01 10:00 slot)

## Unit tests (Node, no dependencies)

Command: `node tests/logic.test.js`

Result: **35/35 passed**, including:
- Creation validation (empty / 31-char names, bestOf 4 rejected)
- 25-0 set win, score reset, set-winner-serves-first
- Win-by-2: 25-24 does not win, 26-24 does; set-point label at 25-24
- Deciding-set targets: 15 in best-of-3 set 3 and best-of-5 set 5; 25 elsewhere
- Match-point label (24-0 in set 2 after winning set 1) vs set-point label
- Undo restores the pre-point state, including undoing a set-winning point
- Swap sides flips names, set scores and current score coherently
- End early: leader wins, tied sets record no winner
- Points after match-over rejected; strict import validation (5 cases)

Repair history: 1 real app bug found by the smoke test, not the unit tests --
the initial server was coded as uppercase `'A'` while the engine uses
lowercase `'a'`/`'b'`, so the serving line named the wrong team before the
first point. Fixed in `js/logic.js` (`server: 'a'`) and covered by a new unit
test; the smoke run was re-run green after the fix.

## Headless-Chrome smoke tests (raw CDP, /opt/meta-chromium/chrome, file://)

Command: `node smoke.mjs` (local QA harness; not part of the pushed repo)

Result: **33/33 passed**, 0 console/page errors, including:
- Setup validation (empty names rejected, stays on setup)
- Scoreboard start, set line target 25, correct first server
- Point 1-0, undo 0-0, swap both ways
- Full match flow: 25-0 + 25-0 sets, match-over banner naming the winner,
  point buttons disabled, history row recorded
- Bangla toggle (html lang=bn, Bengali title), score 2 as Bengali digit,
  language + live match survive reload
- Strict import rejection, zero network resource requests
- No horizontal overflow at desktop 1280 px and at 390 px on all three tabs
