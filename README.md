# Volleyball Scorer BD

An offline, bilingual (English / Bangla) live scoreboard for volleyball matches,
built for school, club and neighbourhood games in Bangladesh. No account, no
server, no network requests -- every match lives in your browser's localStorage.

## Features

1. **Match setup** -- team names (1-30 characters) and format: best of 3
   (first to 2 sets) or best of 5 (first to 3 sets), with inline validation.
2. **Live rally scoring** -- big +1 buttons per team, live set score, sets won,
   current set number and target, serving-team indicator, set-point and
   match-point banners, and an elapsed-time clock.
3. **Real volleyball rules** -- sets 1-4 play to 25 points, the deciding set
   plays to 15, and every set is won by 2 clear points with **no cap**
   (a set at 24-24 continues until one team leads by 2). The team that wins
   a point serves next.
4. **Match controls** -- undo the last point (including undoing a set-winning
   point), swap sides, end a match early (leader on sets wins; a tie is
   recorded as abandoned), and start a new match.
5. **Finished-match history** -- every completed match is kept with its
   set-by-set scores, persisted across reloads.
6. **Data portability** -- export finished matches as JSON, import with strict
   validation (anything not shaped exactly like the app's own export is
   rejected and existing data is left untouched), and a typed-`DELETE`
   erase-all.
7. **Bilingual UI** -- English / Bangla toggle, persisted, with Bengali digits
   in Bangla mode. Fully usable at 390 px mobile width.

## House rules (documented, not hidden)

- The winner of a set serves first in the next set.
- The first server of a match is Team A.
- "New match" discards a live match without saving it; only finished matches
  (including matches ended early) enter history.

## Stack

Vanilla HTML, CSS and JavaScript -- no build step, no dependencies, no
framework. Open `index.html` in any modern browser.

## Run locally

```sh
# No build needed. Serve the folder (or just open index.html):
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Testing

```sh
node tests/logic.test.js   # scoring-engine unit tests (no dependencies)
node smoke.mjs             # headless-Chromium smoke tests (local QA harness, not shipped)
```

## Project structure

```text
index.html        Page shell, tabs, setup + scoreboard + history + data panels
css/style.css     Responsive styles (desktop + 390 px mobile)
js/logic.js       Pure scoring engine (also requireable from Node for tests)
js/i18n.js        English / Bangla strings + Bengali-digit conversion
js/app.js         UI glue, localStorage persistence, history, export/import
tests/logic.test.js  Unit tests for the scoring engine
```

## Limitations

- This is a casual scoreboard, not an official scoring system: it does not
  track rotations, libero changes, timeouts, substitutions or sanctions.
- Data lives only in this browser's localStorage; clearing site data erases it
  (export first if it matters).
- Not affiliated with any volleyball federation.

## Status

MVP complete. See `TEST_RESULTS.md` for the verified test runs.
