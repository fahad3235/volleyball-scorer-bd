'use strict';
/* Node unit tests for js/logic.js -- run: node tests/logic.test.js */
const assert = require('node:assert');
const L = require('../js/logic.js');

let n = 0;
function ok(name, cond) { n += 1; assert.ok(cond, name); console.log('  OK ' + name); }
function give(m, side, count) { for (let i = 0; i < count; i++) L.point(m, side); }

// Creation / validation
ok('reject empty team name', L.createMatch('', 'B', 3) === null);
ok('reject 31-char name', L.createMatch('x'.repeat(31), 'B', 3) === null);
ok('reject bestOf 4', L.createMatch('A', 'B', 4) === null);
const m0 = L.createMatch('Dhaka', 'Chattogram', 3);
ok('best-of-3 needs 2 sets', m0.setsToWin === 2);
ok('initial server is side a (lowercase, matching point codes)', m0.server === 'a');
ok('first set target is 25', L.setTarget(m0) === 25);

// Simple point + server follows scorer
give(m0, 'a', 3);
ok('3 points to A -> 3-0', m0.cur.a === 3 && m0.cur.b === 0);
ok('server is A after A scores', m0.server === 'a');

// Set win at 25-0, then set 2 also to 25
const m1 = L.createMatch('A', 'B', 3);
give(m1, 'a', 25);
ok('25-0 wins set 1, score resets', m1.sets.length === 1 && m1.sets[0].a === 25 && m1.cur.a === 0);
ok('sets won 1-0', m1.setsWon.a === 1 && m1.setsWon.b === 0);
ok('set winner serves first next set', m1.server === 'a');
ok('set 2 target still 25', L.setTarget(m1) === 25);

// Win-by-2: 24-24 -> 25-24 is NOT a win, 26-24 is
const m2 = L.createMatch('A', 'B', 3);
give(m2, 'a', 24); give(m2, 'b', 24);
give(m2, 'a', 1);
ok('25-24 does not win the set', m2.sets.length === 0 && m2.cur.a === 25);
ok('pointLabel is setPoint at 25-24 (one more wins it)', L.pointLabel(m2) === 'setPoint');
give(m2, 'a', 1);
ok('26-24 wins the set', m2.sets.length === 1 && m2.sets[0].a === 26);

// Deciding set to 15 (best-of-3: third set)
const m3 = L.createMatch('A', 'B', 3);
give(m3, 'a', 25); give(m3, 'b', 25);
ok('deciding set target is 15', L.setTarget(m3) === 15);
give(m3, 'a', 15);
ok('15-0 wins deciding set and match', m3.status === 'finished' && m3.winner === 'a');

// Best-of-5: set 4 still to 25, set 5 to 15
const m4 = L.createMatch('A', 'B', 5);
give(m4, 'a', 25); give(m4, 'b', 25); give(m4, 'a', 25);
ok('set 4 target is 25', L.setTarget(m4) === 25);
give(m4, 'b', 25);
ok('set 5 target is 15', L.setTarget(m4) === 15);

// Match point / set point labels
const m5 = L.createMatch('A', 'B', 3);
give(m5, 'a', 25); give(m5, 'a', 24);
ok('matchPoint at 24-0 in set 2 after winning set 1', L.pointLabel(m5) === 'matchPoint');
ok('matchPoint side is a', L.pointLabelSide(m5) === 'a');
const m6 = L.createMatch('A', 'B', 3);
give(m6, 'a', 24);
ok('setPoint at 24-0 in set 1', L.pointLabel(m6) === 'setPoint');

// Undo, including undoing a set-winning point
const m7 = L.createMatch('A', 'B', 3);
give(m7, 'a', 25);
ok('undo restores 24-0 live state', L.undo(m7) && m7.sets.length === 0 && m7.cur.a === 24 && m7.status === 'live');
ok('undo on fresh match is false', L.undo(L.createMatch('A', 'B', 3)) === false);

// Swap sides flips everything coherently
const m8 = L.createMatch('Dhaka', 'CTG', 3);
give(m8, 'a', 25); give(m8, 'b', 10); give(m8, 'a', 5);
L.swapSides(m8);
ok('swap flips names', m8.teamA === 'CTG' && m8.teamB === 'Dhaka');
ok('swap flips set scores', m8.sets[0].a === 0 && m8.sets[0].b === 25);
ok('swap flips current score', m8.cur.a === 10 && m8.cur.b === 5);

// End early: leader wins, tie abandons
const m9 = L.createMatch('A', 'B', 3);
give(m9, 'a', 25);
ok('end early with 1-0 sets -> A wins', L.endEarly(m9) && m9.winner === 'a' && m9.endedEarly);
const m10 = L.createMatch('A', 'B', 3);
give(m10, 'a', 25); give(m10, 'b', 25);
ok('end early tied 1-1 -> no winner', L.endEarly(m10) && m10.winner === null);

// Points after finish are rejected
const m11 = L.createMatch('A', 'B', 3);
give(m11, 'a', 25); give(m11, 'a', 25);
ok('point after match over rejected', L.point(m11, 'a').ok === false);

// Strict import validation
const good = { kind: 'volleyball-scorer-bd', matches: [
  { teamA: 'A', teamB: 'B', bestOf: 3, sets: [{ a: 25, b: 20 }], winner: 'a', endedEarly: false }
] };
ok('valid import accepted', L.validateImport(good) === true);
ok('wrong kind rejected', L.validateImport({ kind: 'nope', matches: [] }) === false);
ok('bad set score rejected', L.validateImport({ kind: 'volleyball-scorer-bd', matches: [
  { teamA: 'A', teamB: 'B', bestOf: 3, sets: [{ a: -1, b: 20 }], winner: 'a', endedEarly: false }
] }) === false);
ok('empty sets rejected', L.validateImport({ kind: 'volleyball-scorer-bd', matches: [
  { teamA: 'A', teamB: 'B', bestOf: 3, sets: [], winner: 'a', endedEarly: false }
] }) === false);
ok('non-array matches rejected', L.validateImport({ kind: 'volleyball-scorer-bd', matches: 'x' }) === false);

console.log('\nUNIT: ' + n + '/' + n + ' passed');
