/* Flip 7 Scorepad — no build step, no dependencies. */
(function () {
  'use strict';

  var STORAGE_KEY = 'flip7-scorepad-v1';
  var NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  var PLUS_MODS = [2, 4, 6, 8, 10];
  var FLIP7_BONUS = 15;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------------------------------------------------------- state */

  var state = load() || freshGame(['Player 1', 'Player 2'], 200);
  var editingId = null;

  function freshGame(names, target) {
    return {
      phase: 'setup',
      target: target,
      round: 1,
      players: names.map(makePlayer),
      entries: {},
      history: [],
      winners: []
    };
  }

  function makePlayer(name) {
    return { id: 'p' + Math.random().toString(36).slice(2, 9), name: name, total: 0 };
  }

  function blankEntry() {
    return { numbers: [], mods: [], x2: false, bust: false, stayed: false };
  }

  function entryFor(id) {
    if (!state.entries[id]) state.entries[id] = blankEntry();
    return state.entries[id];
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && Array.isArray(s.players) && s.players.length) ? s : null;
    } catch (e) { return null; }
  }

  /* -------------------------------------------------------------- scoring */

  function scoreEntry(e) {
    if (e.bust) return 0;
    var sum = e.numbers.reduce(function (a, b) { return a + b; }, 0);
    if (e.x2) sum *= 2;
    sum += e.mods.reduce(function (a, b) { return a + b; }, 0);
    if (isFlip7(e)) sum += FLIP7_BONUS;
    return sum;
  }

  function isFlip7(e) { return e.numbers.length === 7; }

  function isTouched(e) {
    return e.bust || e.stayed || e.numbers.length > 0 || e.mods.length > 0 || e.x2;
  }

  function describe(e) {
    if (e.bust) return 'Busted';
    var bits = [];
    if (e.numbers.length) bits.push(e.numbers.slice().sort(function (a, b) { return a - b; }).join(' · '));
    if (e.x2) bits.push('×2');
    e.mods.slice().sort(function (a, b) { return a - b; }).forEach(function (m) { bits.push('+' + m); });
    if (isFlip7(e)) bits.push('FLIP 7!');
    return bits.length ? bits.join('  ') : 'No cards yet';
  }

  /* --------------------------------------------------------- setup screen */

  function renderSetup() {
    var list = $('player-list');
    list.textContent = '';

    state.players.forEach(function (p, i) {
      var li = document.createElement('li');

      var input = document.createElement('input');
      input.type = 'text';
      input.value = p.name;
      input.maxLength = 16;
      input.setAttribute('aria-label', 'Player ' + (i + 1) + ' name');
      input.addEventListener('input', function () { p.name = input.value; save(); });
      li.appendChild(input);

      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'remove';
      rm.textContent = '×';
      rm.title = 'Remove ' + p.name;
      rm.addEventListener('click', function () {
        ask({
          title: 'Remove ' + (p.name.trim() || 'this player') + '?',
          confirmLabel: 'Remove',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          state.players.splice(state.players.indexOf(p), 1);
          delete state.entries[p.id];
          save();
          renderSetup();
        });
      });
      li.appendChild(rm);

      list.appendChild(li);
    });

    $('target-score').value = state.target;
    var ok = state.players.length >= 2;
    $('btn-start').disabled = !ok;
    $('setup-hint').textContent = ok ? '' : 'Add at least 2 players.';
  }

  /* ---------------------------------------------------------- game screen */

  function renderGame() {
    $('round-no').textContent = state.round;
    var board = $('scoreboard');
    board.textContent = '';

    var leader = Math.max.apply(null, state.players.map(function (p) { return p.total; }));

    state.players.forEach(function (p) {
      var e = entryFor(p.id);
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'row' +
        (e.bust ? ' busted' : isTouched(e) ? ' entered' : '') +
        (p.total >= state.target && p.total === leader ? ' winner' : '');

      var left = document.createElement('span');
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = p.name;
      var cards = document.createElement('span');
      cards.className = 'cards';
      cards.textContent = describe(e);
      left.appendChild(name);
      left.appendChild(cards);

      var delta = document.createElement('span');
      delta.className = 'delta';
      delta.textContent = isTouched(e) ? '+' + scoreEntry(e) : '—';

      var total = document.createElement('span');
      total.className = 'total';
      total.textContent = p.total;

      btn.appendChild(left);
      btn.appendChild(delta);
      btn.appendChild(total);
      btn.addEventListener('click', function () { openEntry(p.id); });

      li.appendChild(btn);
      board.appendChild(li);
    });

    $('btn-undo').disabled = state.history.length === 0;
    renderHistory();
    save();
  }

  function renderHistory() {
    var wrap = $('history-wrap');
    var table = $('history-table');
    table.textContent = '';

    if (!state.history.length) { wrap.hidden = true; return; }
    wrap.hidden = false;

    var thead = table.createTHead().insertRow();
    thead.appendChild(th('Round'));
    state.players.forEach(function (p) { thead.appendChild(th(p.name)); });

    var body = table.createTBody();
    state.history.forEach(function (h) {
      var tr = body.insertRow();
      tr.insertCell().textContent = h.round;
      state.players.forEach(function (p) {
        tr.insertCell().textContent = h.scores[p.id] == null ? '–' : h.scores[p.id];
      });
    });

    var foot = table.createTFoot().insertRow();
    foot.insertCell().textContent = 'Total';
    state.players.forEach(function (p) { foot.insertCell().textContent = p.total; });
  }

  function th(text) {
    var el = document.createElement('th');
    el.scope = 'col';
    el.textContent = text;
    return el;
  }

  /* --------------------------------------------------- confirmation dialog */

  var confirmDlg = $('confirm');

  // Resolves true only when the confirm button is pressed. Cancel, Escape and
  // the backdrop all resolve false, so a stray keypress can never bank or
  // destroy a round.
  function ask(opts) {
    return new Promise(function (resolve) {
      $('confirm-title').textContent = opts.title;
      $('confirm-body').textContent = opts.body || '';

      var ok = $('confirm-ok');
      ok.textContent = opts.confirmLabel || 'Confirm';
      ok.classList.toggle('danger', opts.danger === true);

      confirmDlg.returnValue = '';
      confirmDlg.addEventListener('close', function () {
        resolve(confirmDlg.returnValue === 'ok');
      }, { once: true });
      confirmDlg.showModal();
    });
  }

  /* --------------------------------------------------------- entry dialog */

  var dlg = $('entry');

  function buildCards() {
    var nums = $('numbers');
    NUMBERS.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.textContent = n;
      b.dataset.num = n;
      b.addEventListener('click', function () { toggleNumber(n); });
      nums.appendChild(b);
    });

    var mods = $('modifiers');
    PLUS_MODS.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.textContent = '+' + m;
      b.dataset.mod = m;
      b.addEventListener('click', function () { toggleMod(m); });
      mods.appendChild(b);
    });
    var x2 = document.createElement('button');
    x2.type = 'button';
    x2.className = 'card';
    x2.textContent = '×2';
    x2.dataset.x2 = '1';
    x2.addEventListener('click', function () {
      var e = entryFor(editingId);
      e.x2 = !e.x2;
      syncEntry();
    });
    mods.appendChild(x2);
  }

  function toggleNumber(n) {
    var e = entryFor(editingId);
    var i = e.numbers.indexOf(n);
    if (i >= 0) e.numbers.splice(i, 1);
    else if (e.numbers.length < 7) e.numbers.push(n);
    syncEntry();
  }

  function toggleMod(m) {
    var e = entryFor(editingId);
    var i = e.mods.indexOf(m);
    if (i >= 0) e.mods.splice(i, 1);
    else e.mods.push(m);
    syncEntry();
  }

  function openEntry(id) {
    editingId = id;
    var p = state.players.filter(function (x) { return x.id === id; })[0];
    $('entry-name').textContent = p.name;
    syncEntry();
    dlg.showModal();
  }

  function syncEntry() {
    var e = entryFor(editingId);

    Array.prototype.forEach.call($('numbers').children, function (b) {
      b.classList.toggle('on', e.numbers.indexOf(Number(b.dataset.num)) >= 0);
      b.disabled = e.bust;
    });
    Array.prototype.forEach.call($('modifiers').children, function (b) {
      var on = b.dataset.x2 ? e.x2 : e.mods.indexOf(Number(b.dataset.mod)) >= 0;
      b.classList.toggle('on', on);
      b.disabled = e.bust;
    });

    $('flag-bust').classList.toggle('on', e.bust);
    $('flag-stay').classList.toggle('on', e.stayed);
    $('entry-score').textContent = scoreEntry(e);

    var note = $('entry-note');
    note.classList.toggle('flip7', isFlip7(e) && !e.bust);
    if (e.bust) note.textContent = 'Busted — 0 points this round.';
    else if (isFlip7(e)) note.textContent = 'Flip 7! +' + FLIP7_BONUS + ' bonus, round over.';
    else note.textContent = e.numbers.length + ' of 7 number cards.';

    $('entry-clear').disabled = !isTouched(e);

    renderGame();
  }

  $('flag-bust').addEventListener('click', function () {
    var e = entryFor(editingId);
    e.bust = !e.bust;
    if (e.bust) e.stayed = false;
    syncEntry();
  });

  $('flag-stay').addEventListener('click', function () {
    var e = entryFor(editingId);
    e.stayed = !e.stayed;
    if (e.stayed) e.bust = false;
    syncEntry();
  });

  $('entry-clear').addEventListener('click', function () {
    var e = entryFor(editingId);
    if (!isTouched(e)) return;
    var p = state.players.filter(function (x) { return x.id === editingId; })[0];
    ask({
      title: 'Clear ' + p.name + "'s cards?",
      body: describe(e),
      confirmLabel: 'Clear',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      state.entries[editingId] = blankEntry();
      syncEntry();
    });
  });

  /* ----------------------------------------------------------- round flow */

  function endRound() {
    var scores = {};
    state.players.forEach(function (p) {
      var e = entryFor(p.id);
      var s = scoreEntry(e);
      scores[p.id] = s;
      p.total += s;
    });

    state.history.push({ round: state.round, scores: scores });
    state.entries = {};
    state.round += 1;
    save();
    renderGame();
    checkWinner();
  }

  function undoRound() {
    var last = state.history.pop();
    if (!last) return;
    state.players.forEach(function (p) { p.total -= (last.scores[p.id] || 0); });
    state.entries = {};
    state.round = last.round;
    save();
    renderGame();
  }

  function checkWinner() {
    var best = Math.max.apply(null, state.players.map(function (p) { return p.total; }));
    if (best < state.target) return;
    var champs = state.players.filter(function (p) { return p.total === best; });
    var who = champs.map(function (p) { return p.name; }).join(' & ');
    setTimeout(function () {
      alert((champs.length > 1 ? 'Tie! ' : '') + who + ' ' +
        (champs.length > 1 ? 'win' : 'wins') + ' with ' + best + ' points 🎉');
    }, 60);
  }

  /* ------------------------------------------------------------- controls */

  $('add-player-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var input = $('new-player');
    var name = input.value.trim();
    if (!name) return;
    state.players.push(makePlayer(name));
    input.value = '';
    save();
    renderSetup();
  });

  $('target-score').addEventListener('change', function () {
    var v = parseInt(this.value, 10);
    state.target = (isFinite(v) && v > 0) ? v : 200;
    this.value = state.target;
    save();
  });

  $('btn-start').addEventListener('click', function () {
    state.players.forEach(function (p, i) {
      if (!p.name.trim()) p.name = 'Player ' + (i + 1);
    });
    state.phase = 'game';
    save();
    render();
  });

  $('btn-end-round').addEventListener('click', function () {
    var pending = state.players.filter(function (p) { return !isTouched(entryFor(p.id)); });
    var body = 'Scores are banked and every card pad is cleared.';
    if (pending.length) {
      body = pending.map(function (p) { return p.name; }).join(', ') +
        (pending.length > 1 ? ' have ' : ' has ') + 'nothing entered and will score 0. ' + body;
    }
    ask({
      title: 'End round ' + state.round + '?',
      body: body,
      confirmLabel: 'End round'
    }).then(function (ok) { if (ok) endRound(); });
  });

  $('btn-undo').addEventListener('click', function () {
    var last = state.history[state.history.length - 1];
    if (!last) return;
    var taken = state.players.map(function (p) {
      return p.name + ' \u2212' + (last.scores[p.id] || 0);
    }).join(', ');
    ask({
      title: 'Undo round ' + last.round + '?',
      body: 'Takes back ' + taken +
        '. Anything entered for the current round is cleared too.',
      confirmLabel: 'Undo round',
      danger: true
    }).then(function (ok) { if (ok) undoRound(); });
  });
  $('btn-rules').addEventListener('click', function () { $('rules').showModal(); });

  $('btn-reset').addEventListener('click', function () {
    var played = state.history.length;
    var dirty = played > 0 ||
      state.players.some(function (p) { return isTouched(entryFor(p.id)); });

    // Nothing to lose on a pristine game — don't make them dismiss a dialog.
    if (!dirty) { newGame(); return; }

    ask({
      title: 'Start a new game?',
      body: played
        ? 'All scores from ' + played + (played > 1 ? ' rounds' : ' round') + ' will be lost.'
        : 'The cards entered for this round will be lost.',
      confirmLabel: 'New game',
      danger: true
    }).then(function (ok) { if (ok) newGame(); });
  });

  function newGame() {
    state = freshGame(state.players.map(function (p) { return p.name; }), state.target);
    save();
    render();
  }

  /* ---------------------------------------------------------------- boot */

  function render() {
    var inGame = state.phase === 'game';
    $('setup').hidden = inGame;
    $('game').hidden = !inGame;
    if (inGame) renderGame(); else renderSetup();
  }

  buildCards();
  render();
})();
