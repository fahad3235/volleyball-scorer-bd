'use strict';
/* UI glue for Volleyball Scorer BD. State in localStorage only:
 * vbs_match (live match), vbs_history (finished matches), vbs_lang (en|bn). */
(function () {
  const L = window.VolleyballLogic;
  const I18N = window.VolleyballI18n;
  const $ = function (id) { return document.getElementById(id); };

  let lang = localStorage.getItem('vbs_lang') || 'en';
  let match = null;
  let history = [];
  try { match = JSON.parse(localStorage.getItem('vbs_match') || 'null'); } catch (e) { match = null; }
  try { history = JSON.parse(localStorage.getItem('vbs_history') || '[]'); } catch (e) { history = []; }
  if (!Array.isArray(history)) history = [];
  // A finished match stays on screen (with its banner) until New match is pressed;
  // it is recorded into history exactly once, via the `recorded` flag below.

  function t(key) { return I18N.STR[lang][key] || I18N.STR.en[key] || key; }
  function d(v) { return I18N.toDigits(v, lang); }
  function save() {
    localStorage.setItem('vbs_match', JSON.stringify(match));
    localStorage.setItem('vbs_history', JSON.stringify(history));
    localStorage.setItem('vbs_lang', lang);
  }
  function teamName(side) { return side === 'a' ? match.teamA : match.teamB; }

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    $('langBtn').textContent = lang === 'en' ? '\u09ac\u09be\u0982\u09b2\u09be' : 'English';
    render();
  }

  function showTab(name) {
    ['score', 'history', 'data'].forEach(function (n) {
      $('panel-' + n).hidden = (n !== name);
      $('tab-' + n).classList.toggle('active', n === name);
    });
    if (name === 'history') renderHistory();
  }

  function finishMatch() {
    if (!match || match.recorded) return;
    match.recorded = true;
    match.finishedAtMs = Date.now();
    history.unshift({
      teamA: match.teamA, teamB: match.teamB, bestOf: match.bestOf,
      sets: match.sets, winner: match.winner, endedEarly: match.endedEarly,
      finishedAt: Date.now()
    });
    save();
  }

  function render() {
    $('setupCard').hidden = !!match;
    $('scoreCard').hidden = !match;
    $('resultBanner').hidden = true;
    if (!match) return;
    $('nameLeft').textContent = match.teamA;
    $('nameRight').textContent = match.teamB;
    $('scoreLeft').textContent = d(match.cur.a);
    $('scoreRight').textContent = d(match.cur.b);
    $('setLine').textContent = match.status === 'finished'
      ? t('sets') + ': ' + d(match.setsWon.a) + ' \u2013 ' + d(match.setsWon.b)
      : t('sets') + ': ' + d(match.setsWon.a) + ' \u2013 ' + d(match.setsWon.b) +
        ' (' + t('set') + ' ' + d(match.sets.length + 1) + ' ' + t('toWin') + ' ' + d(L.setTarget(match)) + ')';
    $('serverLine').textContent = t('serving') + ': ' + teamName(match.server);
    const label = L.pointLabel(match);
    const side = L.pointLabelSide(match);
    $('pointLine').textContent = label ? (t(label) + ' \u2014 ' + teamName(side)) : '';
    $('pointLine').hidden = !label;
    $('setScores').textContent = match.sets.length ? match.sets.map(function (s, i) {
      return t('set') + ' ' + d(i + 1) + ': ' + d(s.a) + '\u2013' + d(s.b);
    }).join('  \u00b7  ') : '\u2014';
    $('pointBtnA').disabled = match.status !== 'live';
    $('pointBtnB').disabled = match.status !== 'live';
    $('undoBtn').disabled = match.status !== 'live' || !match.log.length;
    $('swapBtn').disabled = match.status !== 'live';
    $('endEarlyBtn').disabled = match.status !== 'live';
    if (match.status === 'finished') {
      finishMatch();
      $('resultBanner').hidden = false;
      $('resultBanner').textContent = match.winner
        ? teamName(match.winner) + ' ' + t('wonBy')
        : t('abandoned');
    }
  }

  function renderHistory() {
    const box = $('historyList');
    if (!history.length) { box.textContent = t('historyEmpty'); return; }
    box.innerHTML = '';
    history.forEach(function (h) {
      const row = document.createElement('div');
      row.className = 'hist-row';
      const sets = h.sets.map(function (s) { return d(s.a) + '\u2013' + d(s.b); }).join(', ');
      const winner = h.winner ? (h.winner === 'a' ? h.teamA : h.teamB) + ' ' + t('wonBy') : t('abandoned');
      row.textContent = h.teamA + ' vs ' + h.teamB + ' \u2014 ' + sets + ' \u2014 ' + winner;
      box.appendChild(row);
    });
  }

  function tick() {
    if (!match || !match.startedAtMs) { $('timerLine').textContent = t('elapsed') + ': 00:00'; return; }
    const end = match.finishedAtMs || Date.now();
    const s = Math.floor((end - match.startedAtMs) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    $('timerLine').textContent = t('elapsed') + ': ' + d(mm + ':' + ss);
  }

  $('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    save(); applyLang();
  });
  $('tab-score').addEventListener('click', function () { showTab('score'); });
  $('tab-history').addEventListener('click', function () { showTab('history'); });
  $('tab-data').addEventListener('click', function () { showTab('data'); });

  $('startBtn').addEventListener('click', function () {
    const m = L.createMatch($('nameA').value, $('nameB').value, Number($('bestOf').value));
    if (!m) { $('setupError').textContent = t('setupErrorNames'); return; }
    $('setupError').textContent = '';
    match = m;
    save(); render();
  });
  $('pointBtnA').addEventListener('click', function () { L.point(match, 'a'); save(); render(); });
  $('pointBtnB').addEventListener('click', function () { L.point(match, 'b'); save(); render(); });
  $('undoBtn').addEventListener('click', function () { L.undo(match); save(); render(); });
  $('swapBtn').addEventListener('click', function () { L.swapSides(match); save(); render(); });
  $('endEarlyBtn').addEventListener('click', function () { L.endEarly(match); save(); render(); });
  $('newMatchBtn').addEventListener('click', function () { match = null; save(); render(); });
  $('exportBtn').addEventListener('click', function () {
    if (!history.length) { $('dataMsg').textContent = t('exportEmpty'); return; }
    const json = JSON.stringify({ kind: 'volleyball-scorer-bd', matches: history }, null, 2);
    $('exportOutput').value = json;
    $('dataMsg').textContent = '';
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'volleyball-scorer-bd.json';
      a.click();
    } catch (e) { /* file:// may block downloads; the textarea still holds the JSON */ }
  });
  $('importBtn').addEventListener('click', function () {
    let data;
    try { data = JSON.parse($('importInput').value); } catch (e) { data = null; }
    if (!data || !L.validateImport(data)) { $('dataMsg').textContent = t('importBad'); return; }
    history = data.matches;
    save(); renderHistory();
    $('dataMsg').textContent = t('importOk');
  });
  $('eraseBtn').addEventListener('click', function () {
    if ($('eraseInput').value !== 'DELETE') return;
    history = []; match = null;
    save(); render(); renderHistory();
    $('dataMsg').textContent = t('eraseDone');
  });

  setInterval(tick, 1000);
  applyLang();
  showTab('score');
})();
