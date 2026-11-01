/* Volleyball scoring engine (pure, no DOM). Works in browser (window.VolleyballLogic)
 * and in Node (module.exports). Standard rally-scoring rules:
 * - A set is won by the first team to reach its target with a lead of 2 or more.
 * - Sets 1..(bestOf-1) are played to 25; the deciding set (if needed) is played to 15.
 * - There is no points cap: a set continues past the target until one team leads by 2.
 * - The team that wins a point serves next; the winner of a set serves first in the
 *   next set (house rule, documented in the README).
 * - A match is best-of-3 (first to 2 sets) or best-of-5 (first to 3 sets).
 */
(function (global) {
  'use strict';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function validName(n) {
    return typeof n === 'string' && n.trim().length >= 1 && n.trim().length <= 30;
  }

  function createMatch(teamA, teamB, bestOf) {
    if (!validName(teamA) || !validName(teamB)) return null;
    if (bestOf !== 3 && bestOf !== 5) return null;
    return {
      teamA: teamA.trim(), teamB: teamB.trim(), bestOf: bestOf,
      setsToWin: Math.ceil(bestOf / 2),
      sets: [], cur: { a: 0, b: 0 }, server: 'a',
      setsWon: { a: 0, b: 0 }, status: 'live', winner: null,
      endedEarly: false, startedAtMs: null, log: []
    };
  }

  // Target for the set currently being played (deciding set = last possible set).
  function setTarget(m) {
    return m.sets.length === m.bestOf - 1 ? 15 : 25;
  }

  function snapshot(m) {
    const s = clone(m);
    delete s.log;
    return s;
  }

  // Record one point for side 'a' or 'b'. Returns {ok, setCompleted, matchCompleted}.
  function point(m, side) {
    if (!m || m.status !== 'live') return { ok: false, setCompleted: false, matchCompleted: false };
    if (side !== 'a' && side !== 'b') return { ok: false, setCompleted: false, matchCompleted: false };
    m.log.push(snapshot(m));
    if (!m.startedAtMs) m.startedAtMs = Date.now();
    m.cur[side] += 1;
    m.server = side;
    const other = side === 'a' ? 'b' : 'a';
    const target = setTarget(m);
    let setCompleted = false, matchCompleted = false;
    if (m.cur[side] >= target && m.cur[side] - m.cur[other] >= 2) {
      m.sets.push({ a: m.cur.a, b: m.cur.b });
      m.setsWon[side] += 1;
      m.cur = { a: 0, b: 0 };
      setCompleted = true;
      if (m.setsWon[side] >= m.setsToWin) {
        m.status = 'finished';
        m.winner = side;
        matchCompleted = true;
      } else {
        m.server = side; // set winner serves first in the next set
      }
    }
    return { ok: true, setCompleted: setCompleted, matchCompleted: matchCompleted };
  }

  function undo(m) {
    if (!m || m.log.length === 0) return false;
    const stack = m.log;
    const prev = stack.pop();
    const savedLog = stack;
    const keys = Object.keys(m);
    for (const k of keys) delete m[k];
    Object.assign(m, clone(prev));
    m.log = savedLog;
    return true;
  }

  // Swap the two sides of the scoreboard (names, sets won, current points,
  // completed set scores and server all flip together, so the record stays true).
  function swapSides(m) {
    if (!m) return;
    const t = m.teamA; m.teamA = m.teamB; m.teamB = t;
    const w = m.setsWon.a; m.setsWon.a = m.setsWon.b; m.setsWon.b = w;
    const c = m.cur.a; m.cur.a = m.cur.b; m.cur.b = c;
    m.sets = m.sets.map(function (s) { return { a: s.b, b: s.a }; });
    if (m.server === 'a') m.server = 'b';
    else if (m.server === 'b') m.server = 'a';
    if (m.winner === 'a') m.winner = 'b';
    else if (m.winner === 'b') m.winner = 'a';
  }

  // End the match early: the team ahead on sets wins; a tie is recorded as abandoned.
  function endEarly(m) {
    if (!m || m.status !== 'live') return false;
    m.log.push(snapshot(m));
    m.status = 'finished';
    m.endedEarly = true;
    if (m.setsWon.a > m.setsWon.b) m.winner = 'a';
    else if (m.setsWon.b > m.setsWon.a) m.winner = 'b';
    else m.winner = null;
    return true;
  }

  // 'matchPoint' if the leading team wins the match with the next point,
  // 'setPoint' if it wins only the set, otherwise null.
  function pointLabel(m) {
    if (!m || m.status !== 'live') return null;
    const target = setTarget(m);
    for (const side of ['a', 'b']) {
      const other = side === 'a' ? 'b' : 'a';
      if (m.cur[side] + 1 >= target && (m.cur[side] + 1) - m.cur[other] >= 2) {
        return (m.setsWon[side] + 1 >= m.setsToWin) ? 'matchPoint' : 'setPoint';
      }
    }
    return null;
  }

  function pointLabelSide(m) {
    if (!m || m.status !== 'live') return null;
    const target = setTarget(m);
    for (const side of ['a', 'b']) {
      const other = side === 'a' ? 'b' : 'a';
      if (m.cur[side] + 1 >= target && (m.cur[side] + 1) - m.cur[other] >= 2) return side;
    }
    return null;
  }

  function isValidSetScore(s) {
    return s && Number.isInteger(s.a) && Number.isInteger(s.b) &&
      s.a >= 0 && s.b >= 0 && s.a <= 99 && s.b <= 99;
  }

  // Strict import validation: only data shaped exactly like our own export is accepted.
  function validateImport(data) {
    if (!data || data.kind !== 'volleyball-scorer-bd') return false;
    if (!Array.isArray(data.matches)) return false;
    for (const h of data.matches) {
      if (!h || !validName(h.teamA) || !validName(h.teamB)) return false;
      if (h.bestOf !== 3 && h.bestOf !== 5) return false;
      if (!Array.isArray(h.sets) || h.sets.length === 0 || h.sets.length > 5) return false;
      for (const s of h.sets) if (!isValidSetScore(s)) return false;
      if (h.winner !== 'a' && h.winner !== 'b' && h.winner !== null) return false;
      if (typeof h.endedEarly !== 'boolean') return false;
    }
    return true;
  }

  const api = {
    createMatch: createMatch, setTarget: setTarget, point: point,
    undo: undo, swapSides: swapSides, endEarly: endEarly,
    pointLabel: pointLabel, pointLabelSide: pointLabelSide,
    validateImport: validateImport, validName: validName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.VolleyballLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
