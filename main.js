import './style.css';

const app = document.querySelector('#app');

const state = {
  screen: 'home',
  mode: 'ai',
  turn: 'you',
  dice: [],
  diceUsed: [],
  points: Array.from({length: 24}, () => []),
  bar: { you: 0, rival: 0 },
  borneOff: { you: 0, rival: 0 },
  selected: null,
  message: 'أهلًا بيك بطاولي العراق',
  movesLeft: 0,
  gameStarted: false,
  winner: null,
  aiBusy: false,
};

const PLAYER = 'you';
const RIVAL = 'rival';

function makeStartingBoard() {
  // Standard backgammon-style opening. Iraqi house rules must be confirmed before release.
  const p = Array.from({length: 24}, () => []);
  const put = (idx, owner, count) => { for (let i = 0; i < count; i++) p[idx].push(owner); };
  put(23, PLAYER, 2); put(12, PLAYER, 5); put(7, PLAYER, 3); put(5, PLAYER, 5);
  put(0, RIVAL, 2); put(11, RIVAL, 5); put(16, RIVAL, 3); put(18, RIVAL, 5);
  return p;
}

function resetGame() {
  state.points = makeStartingBoard();
  state.bar = { you: 0, rival: 0 };
  state.borneOff = { you: 0, rival: 0 };
  state.turn = 'you';
  state.dice = [];
  state.diceUsed = [];
  state.selected = null;
  state.message = 'دورك — اضغط على «ارمِ النرد»';
  state.movesLeft = 0;
  state.gameStarted = true;
  state.winner = null;
  state.aiBusy = false;
  render();
}

function randomDie() { return Math.floor(Math.random() * 6) + 1; }

function rollDice() {
  if (!state.gameStarted || state.winner || state.turn !== 'you' || state.dice.length) return;
  const a = randomDie(), b = randomDie();
  state.dice = a === b ? [a, a, a, a] : [a, b];
  state.diceUsed = [];
  state.movesLeft = state.dice.length;
  state.message = `طلع النرد ${a} و${b}. اختار الحجر والحركة.`;
  render();
}

function pointOwner(idx) {
  const stack = state.points[idx];
  return stack.length ? stack[stack.length - 1] : null;
}

function currentDice() {
  return state.dice.filter((_, i) => !state.diceUsed.includes(i));
}

function hasCheckerOnBar(player) {
  return state.bar[player] > 0;
}

function direction(player) { return player === PLAYER ? -1 : 1; }

function canMove(from, die, player = PLAYER) {
  if (!state.points[from]?.length || pointOwner(from) !== player) return false;
  if (hasCheckerOnBar(player)) return false;
  const to = from + direction(player) * die;
  if (to < 0 || to > 23) return false;
  const owner = pointOwner(to);
  return !owner || owner === player || state.points[to].length === 1;
}

function moveChecker(from, die, player = PLAYER) {
  const to = from + direction(player) * die;
  if (!canMove(from, die, player)) return false;
  const checker = state.points[from].pop();
  if (state.points[to].length === 1 && pointOwner(to) !== player) {
    const hit = state.points[to].pop();
    state.bar[hit] += 1;
  }
  state.points[to].push(checker);
  return true;
}

function availableDiceFor(from) {
  return currentDice().map((die) => ({die, index: state.dice.findIndex((d, i) => d === die && !state.diceUsed.includes(i))}))
    .filter(({die}) => canMove(from, die));
}

function selectPoint(idx) {
  if (!state.gameStarted || state.winner || state.turn !== PLAYER || state.aiBusy) return;
  if (!state.dice.length) {
    state.message = 'ارمِ النرد أولًا حتى تتحرك.';
    render();
    return;
  }
  if (state.selected !== null) {
    const options = availableDiceFor(state.selected);
    const targetDie = options.find(({die}) => {
      const target = state.selected + direction(PLAYER) * die;
      return target === idx;
    });
    if (targetDie) {
      const from = state.selected;
      moveChecker(from, targetDie.die);
      const index = state.dice.findIndex((d, i) => d === targetDie.die && !state.diceUsed.includes(i));
      state.diceUsed.push(index);
      state.selected = null;
      finishTurnIfNeeded();
      render();
      return;
    }
  }
  if (pointOwner(idx) === PLAYER) {
    state.selected = idx;
    const opts = availableDiceFor(idx);
    state.message = opts.length ? `الحجر محدد. الحركات المتاحة: ${opts.map(o => o.die).join(' أو ')}` : 'هذا الحجر ما عنده حركة متاحة بهالنرد.';
  } else {
    state.selected = null;
    state.message = 'اختار حجر من أحجارك، وبعدها اختار نقطة الوصول.';
  }
  render();
}

function allLegalMoves(player) {
  const moves = [];
  const dice = currentDice();
  if (hasCheckerOnBar(player)) return moves;
  for (let from = 0; from < 24; from++) {
    if (pointOwner(from) !== player) continue;
    for (const die of dice) {
      const to = from + direction(player) * die;
      if (to < 0 || to > 23) continue;
      const owner = pointOwner(to);
      if (!owner || owner === player || state.points[to].length === 1) moves.push({from, to, die});
    }
  }
  return moves;
}

function finishTurnIfNeeded() {
  if (state.borneOff[PLAYER] >= 15) {
    state.winner = PLAYER;
    state.message = 'مبروك! فزت بالمباراة.';
    return;
  }
  if (!currentDice().length) {
    state.turn = RIVAL;
    state.dice = [];
    state.diceUsed = [];
    state.selected = null;
    state.message = 'خلص دورك. دور الخصم…';
    setTimeout(aiTurn, 700);
    return;
  }
  const legal = allLegalMoves(PLAYER);
  if (!legal.length) {
    state.turn = RIVAL;
    state.dice = [];
    state.diceUsed = [];
    state.selected = null;
    state.message = 'ما بقت حركة قانونية. دور الخصم…';
    setTimeout(aiTurn, 700);
  } else {
    state.message = `باقي ${currentDice().length} حركة.`;
  }
}

function aiTurn() {
  if (!state.gameStarted || state.winner || state.turn !== RIVAL) return;
  state.aiBusy = true;
  const a = randomDie(), b = randomDie();
  state.dice = a === b ? [a, a, a, a] : [a, b];
  state.diceUsed = [];
  state.message = `الخصم يرمي النرد: ${a} و${b}…`;
  render();
  let steps = 0;
  const doStep = () => {
    if (!state.gameStarted || state.winner || state.turn !== RIVAL) return;
    const moves = allLegalMoves(RIVAL);
    if (!moves.length || steps >= state.dice.length) {
      state.turn = PLAYER;
      state.dice = [];
      state.diceUsed = [];
      state.selected = null;
      state.aiBusy = false;
      state.message = 'دورك — ارمِ النرد.';
      render();
      return;
    }
    // Simple baseline opponent: prioritize hitting a blot, then advancing.
    moves.sort((m1, m2) => {
      const hit1 = state.points[m1.to].length === 1 && pointOwner(m1.to) === PLAYER ? 100 : 0;
      const hit2 = state.points[m2.to].length === 1 && pointOwner(m2.to) === PLAYER ? 100 : 0;
      return (hit2 + m2.to) - (hit1 + m1.to);
    });
    const move = moves[0];
    const dieIndex = state.dice.findIndex((d, i) => d === move.die && !state.diceUsed.includes(i));
    if (move && move.from + direction(RIVAL) * move.die === move.to) {
      const checker = state.points[move.from].pop();
      if (state.points[move.to].length === 1 && pointOwner(move.to) === PLAYER) {
        state.points[move.to].pop();
        state.bar[PLAYER] += 1;
      }
      state.points[move.to].push(checker);
      if (dieIndex >= 0) state.diceUsed.push(dieIndex);
    }
    steps++;
    state.message = 'الخصم يحرك أحجاره…';
    render();
    setTimeout(doStep, 550);
  };
  setTimeout(doStep, 650);
}

function renderPoint(idx) {
  const stack = state.points[idx];
  const selected = state.selected === idx;
  const canTarget = state.selected !== null && availableDiceFor(state.selected).some(({die}) => state.selected + direction(PLAYER) * die === idx);
  const top = idx >= 12;
  const chips = stack.map((owner, i) => `<span class="checker ${owner === PLAYER ? 'light' : 'dark'} ${i === stack.length - 1 ? 'top-checker' : ''}" style="--i:${i}"></span>`).join('');
  return `<button class="point ${idx % 2 ? 'gold-point' : 'wood-point'} ${top ? 'top' : 'bottom'} ${selected ? 'selected' : ''} ${canTarget ? 'can-target' : ''}" data-point="${idx}" aria-label="نقطة ${idx + 1}">
    <span class="point-number">${idx + 1}</span>
    <span class="checker-stack">${chips}</span>
    ${stack.length > 1 ? `<span class="stack-count">${stack.length}</span>` : ''}
  </button>`;
}

function renderBoard() {
  // Board displayed as 12 points on top and 12 on bottom, using CSS grid.
  const top = Array.from({length: 12}, (_, i) => renderPoint(23 - i)).join('');
  const bottom = Array.from({length: 12}, (_, i) => renderPoint(i)).join('');
  return `<div class="board-shell">
    <div class="board-ornament"><span>TAULA IRAQ</span><span class="ornament-dot">✦</span><span>مجلس الطاولي</span></div>
    <div class="board">
      <div class="board-half top-half">${top}</div>
      <div class="bar-lane"><span class="bar-label">TAULA</span><span class="bar-count">${state.bar.you ? `أحجارك خارج اللوحة: ${state.bar.you}` : '✦'}</span></div>
      <div class="board-half bottom-half">${bottom}</div>
    </div>
    <div class="board-footer"><span>مصنوع بروح عراقية</span><span>✦</span><span>TAULA • 01</span></div>
  </div>`;
}

function renderHome() {
  return `<main class="home-screen">
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
    <header class="topbar"><div class="brand-mark">T<span>✦</span></div><div class="brand-copy"><strong>TAULA IRAQ</strong><small>THE IRAQI BACKGAMMON CLUB</small></div><div class="status-pill"><i></i> إصدار تجريبي</div></header>
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span></span> لعبة من روح المجالس العراقية</div>
        <h1>مو مجرّد<br/><em>طاولي.</em></h1>
        <p>حسابات، حظ، وذكاء… عيش أجواء الطاولي العراقية بتجربة ملكية مصممة للجيل الجديد.</p>
        <div class="hero-actions"><button id="play-ai" class="btn btn-gold"><span>ابدأ اللعب</span><b>←</b></button><button id="play-online" class="btn btn-outline">العب أونلاين <span>↗</span></button></div>
        <div class="hero-meta"><span>01 <small>تصميم فاخر</small></span><span>02 <small>قريبًا أونلاين</small></span><span>03 <small>بالعراقي</small></span></div>
      </div>
      <div class="hero-visual">
        <div class="halo"></div><div class="hero-board">${renderBoard()}</div>
        <div class="floating-card card-one"><span class="tiny-icon">✦</span><div><b>اللعب العراقي</b><small>روح المجلس… بلمسة عصرية</small></div></div>
        <div class="floating-card card-two"><div class="dice-pair"><span>⚄</span><span>⚂</span></div><div><b>دورك هسه</b><small>خلي النرد يحچي</small></div></div>
      </div>
    </section>
    <section class="feature-strip"><div><span class="feature-icon">♟</span><b>تفاصيل دقيقة</b><small>واجهة مصممة بعناية</small></div><div><span class="feature-icon">◈</span><b>تجربة سريعة</b><small>من المتصفح مباشرة</small></div><div><span class="feature-icon">✧</span><b>اللعب ويا الربع</b><small>الغرف الخاصة قيد التطوير</small></div></section>
    <footer class="site-footer"><span>© 2026 TAULA IRAQ</span><span>لعبة تجريبية مستقلة</span><span>بُنيت بشغف في العراق</span></footer>
  </main>`;
}

function renderGame() {
  return `<main class="game-screen">
    <header class="game-header"><button id="back-home" class="icon-btn" aria-label="رجوع">→</button><div class="brand-mark small">T<span>✦</span></div><div class="brand-copy"><strong>TAULA IRAQ</strong><small>مباراة ودّية</small></div><div class="game-mode">${state.mode === 'ai' ? 'ضد الكمبيوتر' : 'أونلاين'}</div></header>
    <section class="match-info"><div class="player"><div class="avatar gold-avatar">أ</div><div><b>أنت</b><small>لاعب المجلس</small></div><span class="turn-dot ${state.turn === PLAYER ? 'active' : ''}"></span></div><div class="match-score"><small>المباراة</small><b>01 <i>—</i> 00</b></div><div class="player rival"><div class="avatar dark-avatar">AI</div><div><b>الخصم</b><small>${state.mode === 'ai' ? 'خصم تجريبي' : 'بانتظار لاعب'}</small></div><span class="turn-dot ${state.turn === RIVAL ? 'active' : ''}"></span></div></section>
    <section class="board-area">${renderBoard()}</section>
    <section class="game-controls"><div class="status-message"><span class="status-spark">✦</span><span>${state.message}</span></div><div class="dice-area">${state.dice.length ? state.dice.map((d, i) => `<div class="die ${state.diceUsed.includes(i) ? 'used' : ''}">${d}</div>`).join('') : '<div class="die empty">?</div><div class="die empty">?</div>'}</div><div class="control-actions"><button id="roll-dice" class="btn btn-gold" ${state.turn !== PLAYER || state.dice.length || state.winner ? 'disabled' : ''}>ارمِ النرد <span>⚄</span></button><button id="new-game" class="btn btn-outline">مباراة جديدة</button></div>${state.winner ? `<div class="winner-banner">${state.winner === PLAYER ? 'مبروك، فزت!' : 'انتهت المباراة'}</div>` : ''}</section>
    <p class="prototype-note">نسخة تجريبية — قواعد الحركة الحالية مبسطة، واللعب الأونلاين غير مفعّل بعد.</p>
  </main>`;
}

function render() {
  app.innerHTML = state.screen === 'home' ? renderHome() : renderGame();
  if (state.screen === 'home') {
    document.querySelector('#play-ai')?.addEventListener('click', () => { state.mode = 'ai'; state.screen = 'game'; resetGame(); });
    document.querySelector('#play-online')?.addEventListener('click', () => showOnlineNotice());
    // Prevent home preview points from behaving like an actual board.
  } else {
    document.querySelectorAll('[data-point]').forEach(btn => btn.addEventListener('click', () => selectPoint(Number(btn.dataset.point))));
    document.querySelector('#roll-dice')?.addEventListener('click', rollDice);
    document.querySelector('#new-game')?.addEventListener('click', resetGame);
    document.querySelector('#back-home')?.addEventListener('click', () => { state.screen = 'home'; state.gameStarted = false; render(); });
  }
}

function showOnlineNotice() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><button class="modal-close" aria-label="إغلاق">×</button><div class="modal-symbol">✦</div><h2>المجلس ينفتح قريبًا</h2><p>اللعب أونلاين يحتاج سيرفر ومزامنة آمنة بين اللاعبين. هذي النسخة تجهز الأساس، والمرحلة الجاية نضيف الغرف الخاصة والاتصال المباشر.</p><button class="btn btn-gold modal-ok">تمام</button></div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('.modal-ok').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

render();
