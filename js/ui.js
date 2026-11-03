/* ============================================================
   OLYMPUS: SURVIVAL — UI / menus / character select
   ============================================================ */

const UI = (() => {
  const el = (id) => document.getElementById(id);
  const SAVE_KEY = 'olympus_save_v1';

  let save = { zeusUnlocked: false, arcadeClears: 0 };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) save = Object.assign(save, JSON.parse(raw));
  } catch (e) { /* ignore */ }

  const state = {
    screen: 'title',
    mode: 'versus',
    p1: 'athena',
    p2: 'ares',
    active: 'p1',
    p2Human: true,
    difficulty: 'normal',
    arena: 'auto',
    arcade: null,
    bindingActive: false,
    lastConfig: null
  };

  let toastTimer = null;
  let unlockTimer = null;

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function show(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = el('screen-' + screenId);
    if (target) target.classList.add('active');
    state.screen = screenId;
    if (screenId === 'title') updateTitleProgress();
    if (screenId === 'roster') renderRoster();
    if (screenId === 'select') renderSelect();
    updateMuteFloat();
  }

  function hideScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    state.screen = 'none';
    updateMuteFloat();
  }

  function updateMuteFloat() {
    const f = el('btn-mute-float');
    if (!f) return;
    f.style.display = (Game.active || state.screen === 'title') ? 'flex' : 'none';
  }

  function hideOverlays() {
    el('screen-pause').classList.add('hidden');
    el('screen-results').classList.add('hidden');
  }

  function toast(msg) {
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function updateTitleProgress() {
    const p = el('title-progress');
    if (!p) return;
    const parts = [];
    if (save.arcadeClears > 0) parts.push(`${save.arcadeClears} ARCADE CLEAR${save.arcadeClears > 1 ? 'S' : ''}`);
    parts.push(save.zeusUnlocked ? 'ZEUS UNLOCKED' : 'ZEUS LOCKED');
    p.textContent = parts.join('  ·  ');
  }

  function syncMute() {
    const m = AudioSys.muted;
    ['btn-mute-select', 'btn-mute-controls', 'btn-mute-roster'].forEach(id => {
      const b = el(id);
      if (b) b.textContent = m ? 'SOUND OFF' : 'SOUND ON';
    });
    const f = el('btn-mute-float');
    if (f) {
      f.classList.toggle('muted', m);
      f.innerHTML = m ? '&#9834;' : '&#9834;';
      f.title = m ? 'Unmute (M)' : 'Mute (M)';
    }
  }

  function refreshBackdrop() {
    let arenaId = state.arena;
    if (!arenaId || arenaId === 'auto') {
      const preview = CHAR_BY_ID[state[state.active] || state.p1];
      arenaId = preview ? preview.arena : 'olympus';
    }
    Game.arena = ARENA_BY_ID[arenaId] || ARENA_BY_ID.olympus;
  }

  /* ---------------- Character select ---------------- */
  function openSelect(mode) {
    Game.quit();
    hideOverlays();
    state.mode = mode;
    state.active = 'p1';
    state.arcade = null;
    state.arena = 'auto';
    if (mode === 'arcade') {
      state.p1 = 'athena';
      state.p2 = null;
      state.p2Human = false;
    } else {
      state.p1 = state.p1 || 'athena';
      state.p2 = state.p2 || 'ares';
      state.p2Human = mode === 'versus';
    }
    show('select');
    refreshBackdrop();
    renderSelect();
    AudioSys.play('ui');
  }

  function isLocked(charId) {
    const c = CHAR_BY_ID[charId];
    return !!(c && c.locked && !save.zeusUnlocked);
  }

  function selectedBy(charId) {
    const marks = [];
    if (state.p1 === charId) marks.push('p1');
    if (state.p2 === charId && state.mode !== 'arcade') marks.push('p2');
    return marks;
  }

  function triggerLabel(side, trigger) {
    const b = Input.bindings[side];
    if (trigger === 's1') return keyLabel(b.s1);
    if (trigger === 's2') return keyLabel(b.s2);
    if (trigger === 'super') return keyLabel(b.super);
    return keyLabel(b.s1) + '+' + keyLabel(b.s2);
  }

  function renderSelect() {
    if (!el('char-grid')) return;
    const mode = state.mode;
    const kicker = mode === 'arcade' ? 'ARCADE LADDER' : mode === 'training' ? 'TRAINING' : (state.p2Human ? 'LOCAL VERSUS' : 'VERSUS · CPU');
    el('select-kicker').textContent = kicker;
    el('select-title').textContent = mode === 'arcade' ? 'CHOOSE YOUR CHAMPION' : 'CHOOSE YOUR GOD';
    const story = el('select-story');
    story.textContent = mode === 'arcade' ? STORY_TEXT : '';
    story.style.display = mode === 'arcade' ? 'block' : 'none';

    // picks
    const p1c = state.p1 ? CHAR_BY_ID[state.p1] : null;
    const p2c = state.p2 ? CHAR_BY_ID[state.p2] : null;
    el('pick-name-p1').textContent = p1c ? p1c.name : 'SELECTING…';
    el('pick-role-p1').textContent = p1c ? p1c.role : '';
    el('pick-name-p2').textContent = mode === 'arcade' ? 'THE LADDER' : (p2c ? p2c.name : 'SELECTING…');
    el('pick-role-p2').textContent = mode === 'arcade' ? '5 GODS + ZEUS' : (p2c ? p2c.role : '');
    el('pick-label-p2').textContent = mode === 'arcade' ? 'OPPONENTS' : (state.mode === 'training' ? 'DUMMY' : (state.p2Human ? 'PLAYER 2' : 'CPU OPPONENT'));
    const pick1 = el('pick-p1');
    const pick2 = el('pick-p2');
    pick1.className = 'pick-card' + (state.active === 'p1' ? ' active-p1' : '');
    pick2.className = 'pick-card' + (state.active === 'p2' ? ' active-p2' : '');
    pick2.style.opacity = mode === 'arcade' ? '0.65' : '1';
    pick2.style.pointerEvents = mode === 'arcade' ? 'none' : 'auto';

    // toggles
    const toggles = el('select-toggles');
    if (mode === 'versus') {
      toggles.innerHTML = `
        <div class="segmented">
          <button data-action="p2-human" data-value="1" class="${state.p2Human ? 'on' : ''}">2P LOCAL</button>
          <button data-action="p2-human" data-value="0" class="${!state.p2Human ? 'on' : ''}">VS CPU</button>
        </div>
        <div class="segmented">
          <button data-action="pick-p1" class="${state.active === 'p1' ? 'on' : ''}">P1 PICK</button>
          <button data-action="pick-p2" class="${state.active === 'p2' ? 'on' : ''}">P2 PICK</button>
        </div>`;
    } else if (mode === 'training') {
      toggles.innerHTML = `
        <div class="segmented">
          <button data-action="pick-p1" class="${state.active === 'p1' ? 'on' : ''}">PLAYER</button>
          <button data-action="pick-p2" class="${state.active === 'p2' ? 'on' : ''}">DUMMY</button>
        </div>
        <div class="segmented"><button class="on" disabled>TRAINING MODE</button></div>`;
    } else {
      toggles.innerHTML = `
        <div class="segmented"><button class="on" disabled>6 FIGHT GAUNTLET</button></div>
        <div class="segmented"><button class="on" disabled>ZEUS AWAITS</button></div>`;
    }

    // character grid
    el('char-grid').innerHTML = ROSTER.map(c => {
      const locked = isLocked(c.id);
      const marks = selectedBy(c.id);
      const cls = 'char-card' + (locked ? ' locked' : '') +
        (marks.includes('p1') ? ' selected-p1' : '') +
        (marks.includes('p2') ? ' selected-p2' : '');
      const badges = [];
      if (marks.includes('p1')) badges.push('<span class="badge p1">P1</span>');
      if (marks.includes('p2')) badges.push('<span class="badge p2">P2</span>');
      if (locked) badges.push('<span class="badge lock">LOCKED</span>');
      else if (c.locked) badges.push('<span class="badge">LEGEND</span>');
      return `
        <button class="${cls}" data-char="${c.id}" title="${esc(c.name)} — ${esc(c.role)}">
          <div class="badges">${badges.join('')}</div>
          <canvas data-portrait="${c.id}" width="140" height="120"></canvas>
          <span class="char-name">${esc(c.name)}</span>
          <span class="char-role">${esc(c.role)}</span>
        </button>`;
    }).join('');
    drawPortraits(el('char-grid'), 150, 122);

    // info panel
    const infoId = state.active === 'p2' ? (state.p2 || state.p1) : (state.p1 || state.p2);
    renderInfo(infoId);

    // arena row
    const chips = [`<button class="arena-chip ${state.arena === 'auto' ? 'on' : ''}" data-arena="auto"><span class="dot" style="background:#ffd873"></span>AUTO</button>`];
    for (const a of ARENAS) {
      chips.push(`<button class="arena-chip ${state.arena === a.id ? 'on' : ''}" data-arena="${a.id}"><span class="dot" style="background:${a.accent}"></span>${esc(a.name)}</button>`);
    }
    el('arena-row').innerHTML = chips.join('');
    el('arena-row').parentElement.style.display = state.mode === 'arcade' ? 'none' : 'flex';

    // difficulty
    const diffRow = el('difficulty-row');
    const showDiff = state.mode === 'arcade' || (state.mode === 'versus' && !state.p2Human);
    diffRow.style.display = showDiff ? 'flex' : 'none';
    diffRow.innerHTML = ['easy', 'normal', 'hard'].map(d =>
      `<button data-diff="${d}" class="${state.difficulty === d ? 'on' : ''}">${d.toUpperCase()}</button>`
    ).join('');

    // start button
    const startBtn = el('btn-start');
    const ready = state.mode === 'arcade' ? !!state.p1 : (!!state.p1 && !!state.p2);
    startBtn.disabled = !ready;
    startBtn.textContent = state.mode === 'arcade' ? 'BEGIN THE TRIAL' : state.mode === 'training' ? 'ENTER TRAINING' : 'FIGHT';
    refreshBackdrop();
  }

  function renderInfo(charId) {
    const box = el('char-info');
    const c = charId ? CHAR_BY_ID[charId] : null;
    if (!c) {
      box.innerHTML = '<div class="info-epithet">Select a god to inspect their powers.</div>';
      return;
    }
    const side = state.active === 'p1' ? 'p1' : 'p2';
    const statRow = (label, value) => `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-bar">${Array.from({ length: 10 }, (_, i) => `<span class="stat-seg ${i < value ? 'on' : ''}"></span>`).join('')}</span>
      </div>`;
    const abilities = c.specials.map(sp => `
      <div class="ability">
        <div class="ability-name"><span>${esc(sp.name)}</span><span class="ability-key">${triggerLabel(side, sp.trigger)}</span></div>
        <div class="ability-desc">${esc(sp.desc)}</div>
      </div>`).join('');
    box.innerHTML = `
      <div class="info-name">${esc(c.name)}</div>
      <div class="info-epithet">${esc(c.epithet)}</div>
      <div class="info-style">${esc(c.style)}</div>
      ${statRow('SPEED', c.stats.speed)}
      ${statRow('POWER', c.stats.power)}
      ${statRow('DEFENCE', c.stats.defense)}
      ${statRow('RANGE', c.stats.range)}
      <div class="info-section">
        <h3>SPECIAL POWERS</h3>
        ${abilities}
      </div>
      <div class="info-section">
        <h3>DIVINE ART · 50% FURY</h3>
        <div class="ability">
          <div class="ability-name"><span>${esc(c.combo.name)}</span><span class="ability-key">${keyLabel(Input.bindings[side].super)} 50%</span></div>
          <div class="ability-desc">${esc(c.combo.desc)}</div>
        </div>
      </div>
      <div class="info-section">
        <h3>ULTIMATE · 100% FURY</h3>
        <div class="ability">
          <div class="ability-name"><span>${esc(c.ultimate.name)}</span><span class="ability-key">SUPER</span></div>
          <div class="ability-desc">${esc(c.ultimate.desc)}</div>
        </div>
      </div>
      <div class="info-section">
        <h3>PASSIVE</h3>
        <div class="ability">
          <div class="ability-name"><span>${esc(c.passive.name)}</span></div>
          <div class="ability-desc">${esc(c.passive.desc)}</div>
        </div>
      </div>`;
  }

  function drawPortraits(root, w, h) {
    if (!root) return;
    root.querySelectorAll('canvas[data-portrait]').forEach(cv => {
      const id = cv.dataset.portrait;
      let pw = w || 150, ph = h || 130;
      if (cv.id === 'result-portrait') { pw = 240; ph = 270; }
      if (root.id === 'roster-body') { pw = 210; ph = 230; }
      Render.drawPortrait(cv, id, pw, ph);
    });
  }

  function chooseCharacter(id) {
    if (isLocked(id)) {
      toast('ZEUS IS LOCKED — complete the Arcade ladder to unlock the King of the Gods.');
      AudioSys.play('error');
      return;
    }
    if (state.mode === 'arcade') {
      state.p1 = id;
    } else if (state.active === 'p2') {
      state.p2 = id;
      state.active = 'p1';
    } else {
      state.p1 = id;
      if (state.mode === 'versus' || state.mode === 'training') state.active = 'p2';
    }
    AudioSys.play('select');
    renderSelect();
  }

  /* ---------------- Controls ---------------- */
  function buildControls() {
    const build = (pid, title) => {
      const rows = ACTIONS.map(a => `
        <div class="bind-row">
          <span class="bind-label">${esc(a.label)}</span>
          <button class="bind-btn" data-bind-player="${pid}" data-bind-action="${a.id}">${esc(keyLabel(Input.bindings[pid][a.id]))}</button>
        </div>`).join('');
      return `<h2>${title}</h2>${rows}`;
    };
    el('controls-p1').innerHTML = build('p1', 'PLAYER 1');
    el('controls-p2').innerHTML = build('p2', 'PLAYER 2');
  }

  function beginBind(pid, action, btn) {
    if (state.bindingActive) return;
    state.bindingActive = true;
    btn.classList.add('listening');
    btn.textContent = 'PRESS…';
    AudioSys.play('ui');
    Input.beginCapture((code) => {
      if (code !== 'Escape') {
        Input.setBinding(pid, action, code);
        AudioSys.play('select');
        toast('Bound ' + ACTIONS.find(a => a.id === action).label + ' to ' + keyLabel(code));
      } else {
        AudioSys.play('back');
      }
      setTimeout(() => {
        state.bindingActive = false;
        buildControls();
        if (state.screen === 'select') renderSelect();
      }, 0);
    });
  }

  /* ---------------- Codex ---------------- */
  function renderRoster() {
    const body = el('roster-body');
    if (!body) return;
    body.innerHTML = ROSTER.map(c => {
      const locked = isLocked(c.id);
      const specials = c.specials.map(sp => `
        <div class="codex-item"><span class="key">${triggerLabel('p1', sp.trigger)}</span><b>${esc(sp.name)}</b> — ${esc(sp.desc)}</div>`).join('');
      return `
        <article class="codex-card ${locked ? 'codex-locked' : ''}">
          <div class="codex-portrait"><canvas data-portrait="${c.id}" width="210" height="230"></canvas></div>
          <div class="codex-main">
            <div class="codex-name">${esc(c.name)} ${locked ? '· LOCKED' : ''}</div>
            <div class="codex-role">${esc(c.role)} · ${esc(c.style)}</div>
            <div class="codex-epithet">${esc(c.epithet)}</div>
            <div class="codex-grid">${specials}</div>
            <div class="codex-item" style="margin-top:.45em"><span class="key">${triggerLabel('p1', 'super')} · 50%</span><b>${esc(c.combo.name)}</b> — ${esc(c.combo.desc)}</div>
            <div class="codex-item" style="margin-top:.35em"><b>${esc(c.ultimate.name)}</b> — ${esc(c.ultimate.desc)}</div>
            <div class="codex-passive"><b>Passive · ${esc(c.passive.name)}</b> — ${esc(c.passive.desc)}</div>
          </div>
        </article>`;
    }).join('');
    drawPortraits(body);
  }

  /* ---------------- Match flow ---------------- */
  function startFromSelect() {
    if (state.mode === 'arcade') {
      startArcade();
      return;
    }
    if (!state.p1 || !state.p2) {
      toast('Choose a god for both sides first.');
      return;
    }
    let arena = state.arena;
    if (!arena || arena === 'auto') arena = CHAR_BY_ID[state.p2].arena;
    const cfg = {
      mode: state.mode,
      p1: state.p1,
      p2: state.p2,
      p2Human: state.mode === 'versus' ? state.p2Human : false,
      difficulty: state.difficulty,
      arena
    };
    state.lastConfig = cfg;
    hideScreens();
    hideOverlays();
    Game.startMatch(cfg);
    Game.setPaused(false);
    updateMuteFloat();
    AudioSys.play('select');
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startArcade() {
    const p1 = state.p1 || 'athena';
    const finalBoss = p1 === 'zeus' ? 'hera' : 'zeus';
    const pool = ROSTER.map(c => c.id).filter(id => id !== p1 && id !== finalBoss && id !== 'zeus');
    shuffle(pool);
    const ladder = pool.slice(0, 5);
    ladder.push(finalBoss);
    state.arcade = {
      ladder,
      index: 0,
      difficulty: state.difficulty,
      playerChar: p1,
      cleared: false
    };
    startArcadeMatch();
  }

  function startArcadeMatch() {
    const a = state.arcade;
    if (!a) { openSelect('arcade'); return; }
    const opp = a.ladder[a.index];
    const cfg = {
      mode: 'arcade',
      p1: a.playerChar,
      p2: opp,
      p2Human: false,
      difficulty: a.difficulty,
      arena: CHAR_BY_ID[opp].arena,
      arcade: { ladder: a.ladder.slice(), index: a.index, difficulty: a.difficulty, playerChar: a.playerChar }
    };
    state.lastConfig = cfg;
    hideScreens();
    hideOverlays();
    Game.startMatch(cfg);
    Game.setPaused(false);
    updateMuteFloat();
    AudioSys.play('select');
    Game.arena = ARENA_BY_ID[CHAR_BY_ID[opp].arena] || ARENA_BY_ID.olympus;
  }

  function showResults(result) {
    if (!result) return;
    Game.setPaused(true);
    hideScreens();
    el('screen-pause').classList.add('hidden');
    const arcade = result.mode === 'arcade';
    const won = result.winnerIdx === 0;
    let html = '';
    let actions = [];

    if (arcade) {
      const a = state.arcade;
      if (!a) { quitToMenu(); return; }
      if (won) {
        if (a.index >= a.ladder.length - 1) {
          const first = !save.zeusUnlocked;
          save.zeusUnlocked = true;
          save.arcadeClears = (save.arcadeClears || 0) + 1;
          a.cleared = true;
          persist();
          updateTitleProgress();
          html = resultMarkup({
            eyebrow: 'ARCADE · COMPLETE',
            title: 'THE PANTHEON FALLS',
            sub: 'You have broken every god on the ladder — including the King of Olympus.',
            portrait: 'zeus',
            score: `${result.wins[0]} — ${result.wins[1]}`,
            note: first ? 'ZEUS, KING OF THE GODS, IS NOW UNLOCKED IN EVERY MODE.' : 'The arcade has been conquered again. The gods never learn.',
            unlock: true,
            finisher: result.finisher
          });
          actions = [
            { label: 'NEW ARCADE', action: 'new-arcade', primary: true },
            { label: 'MAIN MENU', action: 'menu' }
          ];
        } else {
          const nextId = a.ladder[a.index + 1];
          const next = CHAR_BY_ID[nextId];
          html = resultMarkup({
            eyebrow: 'ARCADE · VICTORY',
            title: 'ONE GOD FALLS',
            sub: `${CHAR_BY_ID[result.p1Char].name} defeats ${CHAR_BY_ID[result.p2Char].name}.`,
            portrait: nextId,
            score: `${result.wins[0]} — ${result.wins[1]}`,
            note: `NEXT OPPONENT · ${next.name} — ${next.role}. ${next.blurb}`,
            finisher: result.finisher
          });
          actions = [
            { label: 'CONTINUE', action: 'arcade-next', primary: true },
            { label: 'MAIN MENU', action: 'menu' }
          ];
        }
      } else {
        html = resultMarkup({
          eyebrow: 'ARCADE · DEFEAT',
          title: 'THE TRIAL ENDS',
          sub: `${CHAR_BY_ID[result.p2Char].name} defends the summit.`,
          portrait: result.p2Char,
          score: `${result.wins[0]} — ${result.wins[1]}`,
          note: 'The ladder resets only if you leave it. Retry this opponent and climb again.'
        });
        actions = [
          { label: 'RETRY', action: 'retry-arcade', primary: true },
          { label: 'CHARACTER SELECT', action: 'select' },
          { label: 'MAIN MENU', action: 'menu' }
        ];
      }
    } else {
      const twoP = result.mode === 'versus' && Game.p2Human;
      const winnerChar = CHAR_BY_ID[result.winnerChar];
      const loserChar = CHAR_BY_ID[result.winnerIdx === 0 ? result.p2Char : result.p1Char];
      html = resultMarkup({
        eyebrow: result.mode === 'versus' ? (twoP ? 'LOCAL VERSUS' : 'VERSUS · CPU') : 'TRAINING',
        title: twoP ? `PLAYER ${result.winnerIdx + 1} WINS` : (won ? 'VICTORY' : 'DEFEAT'),
        sub: `${winnerChar.name} defeats ${loserChar.name}.`,
        portrait: result.winnerChar,
        score: `${result.wins[0]} — ${result.wins[1]}`,
        note: `“${VICTORY_LINES[result.winnerChar] || ''}” — ${winnerChar.name}`,
        finisher: result.finisher
      });
      actions = [
        { label: 'REMATCH', action: 'rematch', primary: true },
        { label: 'CHARACTER SELECT', action: 'select' },
        { label: 'MAIN MENU', action: 'menu' }
      ];
    }

    el('result-body').innerHTML = html;
    el('result-actions').innerHTML = actions.map(a =>
      `<button class="${a.primary ? 'primary-btn' : 'ghost-btn'}" data-action="${a.action}">${a.label}</button>`
    ).join('');
    el('screen-results').classList.remove('hidden');
    drawPortraits(el('result-body'), 240, 270);
    updateMuteFloat();
  }

  function resultMarkup(d) {
    return `
      <div class="result-eyebrow">${esc(d.eyebrow)}</div>
      <div class="result-main">
        <div class="result-portrait-wrap"><canvas id="result-portrait" data-portrait="${d.portrait}" width="240" height="270"></canvas></div>
        <div class="result-detail">
          <div class="result-title">${esc(d.title)}</div>
          <div class="result-sub">${esc(d.sub)}</div>
          <div class="result-score">${esc(d.score)}</div>
          <div class="result-note">${esc(d.note)}</div>
          ${d.finisher ? '<div class="result-finisher">FINISHER · DIVINE FURY</div>' : ''}
          ${d.unlock ? '<div class="result-unlock">ZEUS UNLOCKED</div>' : ''}
        </div>
      </div>`;
  }

  function showUnlockBanner() {
    const banner = el('unlock-banner');
    banner.classList.remove('hidden');
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
    if (unlockTimer) clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => banner.classList.add('hidden'), 3400);
  }

  function hideResults() {
    el('screen-results').classList.add('hidden');
    Game.setPaused(false);
  }

  function rematch() {
    if (!state.lastConfig) { quitToMenu(); return; }
    el('screen-results').classList.add('hidden');
    hideScreens();
    Game.startMatch(state.lastConfig);
    Game.setPaused(false);
    updateMuteFloat();
    AudioSys.play('select');
  }

  function quitToMenu() {
    Game.quit();
    hideOverlays();
    state.arcade = null;
    AudioSys.stopAmbient();
    Game.arena = ARENA_BY_ID.olympus;
    show('title');
    updateTitleProgress();
    syncMute();
  }

  function togglePause() {
    if (!Game.active) return;
    if (!el('screen-results').classList.contains('hidden')) return;
    const overlay = el('screen-pause');
    if (overlay.classList.contains('hidden')) {
      Game.setPaused(true);
      const [a, b] = Game.fighters;
      if (a && b) {
        el('pause-sub').textContent = `${a.char.name}  vs  ${b.char.name}  ·  ${Game.mode === 'arcade' ? 'ARCADE' : Game.mode === 'training' ? 'TRAINING' : 'VERSUS'}`;
      }
      overlay.classList.remove('hidden');
      AudioSys.play('ui');
    } else {
      overlay.classList.add('hidden');
      Game.setPaused(false);
      AudioSys.play('ui');
    }
  }

  function resume() {
    el('screen-pause').classList.add('hidden');
    Game.setPaused(false);
    AudioSys.play('ui');
  }

  function restartMatch() {
    if (!state.lastConfig) return;
    el('screen-pause').classList.add('hidden');
    hideScreens();
    Game.startMatch(state.lastConfig);
    Game.setPaused(false);
    updateMuteFloat();
    AudioSys.play('select');
  }

  /* ---------------- Events ---------------- */
  function handleClick(e) {
    if (state.bindingActive) return;
    const charBtn = e.target.closest('[data-char]');
    if (charBtn) {
      chooseCharacter(charBtn.dataset.char);
      return;
    }
    const arenaBtn = e.target.closest('[data-arena]');
    if (arenaBtn) {
      state.arena = arenaBtn.dataset.arena;
      AudioSys.play('ui');
      renderSelect();
      return;
    }
    const diffBtn = e.target.closest('[data-diff]');
    if (diffBtn) {
      state.difficulty = diffBtn.dataset.diff;
      AudioSys.play('ui');
      renderSelect();
      return;
    }
    const bindBtn = e.target.closest('[data-bind-player]');
    if (bindBtn) {
      beginBind(bindBtn.dataset.bindPlayer, bindBtn.dataset.bindAction, bindBtn);
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;
    switch (action) {
      case 'arcade': openSelect('arcade'); break;
      case 'versus': openSelect('versus'); break;
      case 'training': openSelect('training'); break;
      case 'roster': show('roster'); AudioSys.play('ui'); break;
      case 'controls': buildControls(); show('controls'); AudioSys.play('ui'); break;
      case 'back':
        if (state.screen === 'select' || state.screen === 'controls' || state.screen === 'roster') {
          AudioSys.play('back');
          show('title');
        }
        break;
      case 'mute': AudioSys.toggleMute(); syncMute(); AudioSys.play('ui'); break;
      case 'random': {
        const pool = ROSTER.filter(c => !isLocked(c.id));
        if (state.active === 'p2' && state.mode !== 'arcade') {
          state.p2 = pool[(Math.random() * pool.length) | 0].id;
          state.active = 'p1';
        } else {
          state.p1 = pool[(Math.random() * pool.length) | 0].id;
          if (state.mode !== 'arcade') state.active = 'p2';
        }
        AudioSys.play('select');
        renderSelect();
        break;
      }
      case 'pick-p1':
        state.active = 'p1';
        AudioSys.play('ui');
        renderSelect();
        break;
      case 'pick-p2':
        if (state.mode === 'arcade') break;
        state.active = 'p2';
        AudioSys.play('ui');
        renderSelect();
        break;
      case 'p2-human':
        state.p2Human = actionBtn.dataset.value === '1';
        AudioSys.play('ui');
        renderSelect();
        break;
      case 'start': startFromSelect(); break;
      case 'resume': resume(); break;
      case 'restart': restartMatch(); break;
      case 'quit': quitToMenu(); break;
      case 'rematch': rematch(); break;
      case 'arcade-next':
        if (state.arcade) {
          state.arcade.index++;
          el('screen-results').classList.add('hidden');
          startArcadeMatch();
        }
        break;
      case 'retry-arcade':
        el('screen-results').classList.add('hidden');
        startArcadeMatch();
        break;
      case 'new-arcade':
        el('screen-results').classList.add('hidden');
        openSelect('arcade');
        break;
      case 'select': {
        const mode = Game.mode;
        el('screen-results').classList.add('hidden');
        Game.quit();
        openSelect(mode || 'versus');
        break;
      }
      case 'menu':
        el('screen-results').classList.add('hidden');
        quitToMenu();
        break;
      case 'reset-bindings':
        Input.resetBindings();
        buildControls();
        if (state.screen === 'select') renderSelect();
        AudioSys.play('select');
        toast('Controls reset to defaults.');
        break;
      default: break;
    }
  }

  function handleKey(e) {
    if (state.bindingActive) {
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape') {
      if (!el('screen-results').classList.contains('hidden')) return;
      if (!el('screen-pause').classList.contains('hidden')) {
        resume();
        return;
      }
      if (Game.active) {
        togglePause();
        return;
      }
      if (state.screen === 'select' || state.screen === 'controls' || state.screen === 'roster') {
        AudioSys.play('back');
        show('title');
      }
      return;
    }
    if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !Input.isBound('KeyM')) {
      AudioSys.toggleMute();
      syncMute();
      AudioSys.play('ui');
      return;
    }
    if (e.code === 'KeyZ' && e.shiftKey && state.screen === 'select') {
      if (!save.zeusUnlocked) {
        save.zeusUnlocked = true;
        persist();
        updateTitleProgress();
        showUnlockBanner();
        renderSelect();
        renderRoster();
        AudioSys.play('victory');
      }
    }
  }

  function updateScale() {
    const stage = el('stage');
    const ui = el('ui');
    if (!stage || !ui) return;
    const w = stage.getBoundingClientRect().width;
    ui.style.fontSize = Math.max(9, (w / 1280) * 16) + 'px';
  }

  function init() {
    document.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('resize', updateScale);
    if (window.ResizeObserver) {
      try { new ResizeObserver(updateScale).observe(el('stage')); } catch (e) { /* ignore */ }
    }
    updateScale();
    buildControls();
    renderRoster();
    updateTitleProgress();
    syncMute();
    state.p1 = 'athena';
    state.p2 = 'ares';
    state.active = 'p1';
    Game.onMatchEnd = showResults;
    Game.arena = ARENA_BY_ID.olympus;
    show('title');
  }

  return {
    init, show, toast, togglePause, showResults, quitToMenu,
    syncMute, updateScale,
    get save() { return save; }
  };
})();
