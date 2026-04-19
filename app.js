'use strict';

// ===== STATE =====
const state = {
  games: [],
  currentGame: null,
  activeTeam: 1,
  selectedPlayerIdx: null,
  history: [],
  viewingGameIdx: -1,
};

// ===== STAT DEFINITIONS =====
const SCORING_STATS = [
  { key: 'ftm',   label: 'Free Throw',  icon: '🎯', cat: 'scoring', pts: 1  },
  { key: 'fgm2',  label: '2-Pointer',   icon: '🏀', cat: 'scoring', pts: 2  },
  { key: 'fgm3',  label: '3-Pointer',   icon: '🔥', cat: 'scoring', pts: 3  },
];
const MISS_STATS = [
  { key: 'ftmiss',   label: 'FT Miss',   icon: '✗', cat: 'miss' },
  { key: 'fgmiss2',  label: '2PT Miss',  icon: '✗', cat: 'miss' },
  { key: 'fgmiss3',  label: '3PT Miss',  icon: '✗', cat: 'miss' },
];
const OTHER_STATS = [
  { key: 'oreb', label: 'Off Rebound', icon: '💪', cat: 'positive' },
  { key: 'dreb', label: 'Def Rebound', icon: '🛡️', cat: 'positive' },
  { key: 'ast',  label: 'Assist',      icon: '🤝', cat: 'positive' },
  { key: 'stl',  label: 'Steal',       icon: '✋', cat: 'positive' },
  { key: 'blk',  label: 'Block',       icon: '🚧', cat: 'positive' },
  { key: 'to',   label: 'Turnover',    icon: '💸', cat: 'negative' },
  { key: 'pf',   label: 'Foul',        icon: '⚠️', cat: 'negative' },
];

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', '2OT', '3OT'];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('bball-games');
  if (saved) state.games = JSON.parse(saved);

  const current = localStorage.getItem('bball-current');
  if (current) {
    state.currentGame = JSON.parse(current);
  }

  renderHomeScreen();
});

// ===== SCREEN NAVIGATION =====
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  if (name === 'home') renderHomeScreen();
}

// ===== HOME SCREEN =====
function renderHomeScreen() {
  const g = state.currentGame;
  const banner = document.getElementById('resume-banner');

  if (g && !g.finished) {
    banner.classList.remove('hidden');
    document.getElementById('resume-score').textContent =
      `${g.team1.name} ${g.team1.score} – ${g.team2.score} ${g.team2.name}`;
  } else {
    banner.classList.add('hidden');
  }

  const container = document.getElementById('games-list');
  if (state.games.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🏀</span>
        No games yet.<br>Tap <strong>+ New Game</strong> to get started.
      </div>`;
    return;
  }

  const cards = state.games.slice().reverse().map((game, revIdx) => {
    const realIdx = state.games.length - 1 - revIdx;
    const winner = game.team1.score > game.team2.score ? 1
                 : game.team2.score > game.team1.score ? 2 : 0;
    return `
      <div class="game-card" onclick="viewGame(${realIdx})">
        <div class="game-card-title">${escHtml(game.name)}</div>
        <div class="game-card-matchup">
          <span style="color:${game.team1.color};font-weight:${winner===1?'900':'700'}">${escHtml(game.team1.name)} ${game.team1.score}</span>
          <span class="game-card-vs">–</span>
          <span style="color:${game.team2.color};font-weight:${winner===2?'900':'700'}">${game.team2.score} ${escHtml(game.team2.name)}</span>
        </div>
        <div class="game-card-meta">${new Date(game.date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="games-section-label">Recent Games</div>${cards}`;
}

function resumeGame() {
  state.history = [];
  state.activeTeam = 1;
  state.selectedPlayerIdx = null;
  showScreen('game');
  renderGameScreen();
}

function discardGame() {
  if (!confirm('Discard the current game in progress?')) return;
  state.currentGame = null;
  localStorage.removeItem('bball-current');
  renderHomeScreen();
}

// ===== SETUP SCREEN =====
function goToSetup() {
  // Reset setup form
  document.getElementById('game-name').value = '';
  document.getElementById('team1-name').value = '';
  document.getElementById('team2-name').value = '';
  document.getElementById('team1-color').value = '#E85D04';
  document.getElementById('team2-color').value = '#1971C2';
  document.getElementById('team1-players-list').innerHTML = '';
  document.getElementById('team2-players-list').innerHTML = '';

  // Add 5 default player rows
  for (let i = 0; i < 5; i++) addPlayerRow(1);
  for (let i = 0; i < 5; i++) addPlayerRow(2);

  showScreen('setup');
}

function addPlayerRow(teamNum) {
  const container = document.getElementById('team' + teamNum + '-players-list');
  const row = document.createElement('div');
  row.className = 'player-row-input';
  row.innerHTML = `
    <input type="text" class="player-num-input" placeholder="#" maxlength="3" inputmode="numeric">
    <input type="text" class="player-name-input" placeholder="Player name">
    <button class="btn-remove-player" onclick="this.parentElement.remove()" aria-label="Remove">&#10005;</button>
  `;
  container.appendChild(row);
}

function readPlayers(teamNum) {
  const rows = document.querySelectorAll('#team' + teamNum + '-players-list .player-row-input');
  const players = [];
  rows.forEach(row => {
    const num  = row.querySelector('.player-num-input').value.trim();
    const name = row.querySelector('.player-name-input').value.trim();
    if (name) {
      players.push({ num: num || '?', name, stats: freshStats() });
    }
  });
  return players;
}

function freshStats() {
  return { ftm:0, fta:0, fgm2:0, fga2:0, fgm3:0, fga3:0, oreb:0, dreb:0, ast:0, stl:0, blk:0, to:0, pf:0 };
}

function startGame() {
  const t1name  = document.getElementById('team1-name').value.trim() || 'Team 1';
  const t2name  = document.getElementById('team2-name').value.trim() || 'Team 2';
  const t1color = document.getElementById('team1-color').value;
  const t2color = document.getElementById('team2-color').value;
  const gameName = document.getElementById('game-name').value.trim()
                || `${t1name} vs ${t2name}`;

  let t1players = readPlayers(1);
  let t2players = readPlayers(2);
  if (t1players.length === 0) t1players = [{ num:'1', name:'Player 1', stats: freshStats() }];
  if (t2players.length === 0) t2players = [{ num:'1', name:'Player 1', stats: freshStats() }];

  state.currentGame = {
    id: Date.now(),
    name: gameName,
    date: Date.now(),
    period: 1,
    finished: false,
    team1: { name: t1name, color: t1color, score: 0, players: t1players },
    team2: { name: t2name, color: t2color, score: 0, players: t2players },
  };

  state.history = [];
  state.activeTeam = 1;
  state.selectedPlayerIdx = null;

  saveCurrentGame();
  showScreen('game');
  renderGameScreen();
}

// ===== GAME SCREEN =====
function renderGameScreen() {
  const g = state.currentGame;

  // Scoreboard
  const t1abbr = abbr(g.team1.name);
  const t2abbr = abbr(g.team2.name);
  document.getElementById('t1-abbr').textContent  = t1abbr;
  document.getElementById('t2-abbr').textContent  = t2abbr;
  document.getElementById('t1-score').textContent = g.team1.score;
  document.getElementById('t2-score').textContent = g.team2.score;
  document.getElementById('t1-block').style.color = g.team1.color;
  document.getElementById('t2-block').style.color = g.team2.color;
  document.getElementById('period-display').textContent = PERIODS[g.period - 1] || 'OT';

  // Tabs
  const tab1 = document.getElementById('tab1');
  const tab2 = document.getElementById('tab2');
  tab1.textContent = g.team1.name;
  tab2.textContent = g.team2.name;
  const at = state.activeTeam;
  tab1.classList.toggle('active', at === 1);
  tab2.classList.toggle('active', at === 2);
  tab1.style.borderBottomColor = at === 1 ? g.team1.color : 'transparent';
  tab2.style.borderBottomColor = at === 2 ? g.team2.color : 'transparent';
  tab1.style.color = at === 1 ? g.team1.color : '';
  tab2.style.color = at === 2 ? g.team2.color : '';

  renderPlayerList();
}

function renderPlayerList() {
  const g = state.currentGame;
  const team = at(g);
  const container = document.getElementById('players-container');

  if (team.players.length === 0) {
    container.innerHTML = '<div class="empty-state">No players on this team.</div>';
    return;
  }

  container.innerHTML = team.players.map((p, i) => {
    const pts = calcPts(p);
    const reb = (p.stats.oreb || 0) + (p.stats.dreb || 0);
    const isSelected = state.selectedPlayerIdx === i;
    return `
      <div class="player-stat-row"
           onclick="selectPlayer(${i})"
           style="border-color:${isSelected ? team.color : 'transparent'}">
        <div class="player-badge" style="background:${team.color}22;color:${team.color}">${escHtml(p.num)}</div>
        <div class="player-info">
          <div class="player-name">${escHtml(p.name)}</div>
          <div class="player-quick-stats">REB ${reb} &middot; AST ${p.stats.ast} &middot; STL ${p.stats.stl} &middot; BLK ${p.stats.blk} &middot; TO ${p.stats.to} &middot; PF ${p.stats.pf}</div>
        </div>
        <div class="player-pts-display" style="color:${team.color}">${pts}</div>
      </div>`;
  }).join('');
}

function at(g) {
  return state.activeTeam === 1 ? g.team1 : g.team2;
}

function switchTab(teamNum) {
  state.activeTeam = teamNum;
  state.selectedPlayerIdx = null;
  renderGameScreen();
}

function prevPeriod() {
  if (state.currentGame.period > 1) {
    state.currentGame.period--;
    saveCurrentGame();
    document.getElementById('period-display').textContent = PERIODS[state.currentGame.period - 1] || 'OT';
  }
}

function nextPeriod() {
  if (state.currentGame.period < PERIODS.length) {
    state.currentGame.period++;
    saveCurrentGame();
    document.getElementById('period-display').textContent = PERIODS[state.currentGame.period - 1] || 'OT';
  }
}

// ===== STAT MODAL =====
function selectPlayer(idx) {
  state.selectedPlayerIdx = idx;
  renderPlayerList();
  openStatModal(idx);
}

function openStatModal(idx) {
  const g = state.currentGame;
  const team = at(g);
  const player = team.players[idx];

  const label = (player.num && player.num !== '?')
    ? `#${player.num} ${player.name}`
    : player.name;
  document.getElementById('modal-player-label').textContent = label;

  document.getElementById('stat-scoring').innerHTML = renderStatBtns(SCORING_STATS);
  document.getElementById('stat-misses').innerHTML  = renderStatBtns(MISS_STATS);
  document.getElementById('stat-other').innerHTML   = renderStatBtns(OTHER_STATS);

  document.getElementById('stat-modal').classList.remove('hidden');
}

function renderStatBtns(defs) {
  return defs.map(s => `
    <button class="stat-btn ${s.cat}" onclick="recordStat('${s.key}')">
      <span class="stat-icon">${s.icon}</span>
      <span>${s.label}</span>
    </button>`).join('');
}

function closeStatModal() {
  document.getElementById('stat-modal').classList.add('hidden');
  state.selectedPlayerIdx = null;
  renderPlayerList();
}

function recordStat(statKey) {
  const g = state.currentGame;
  const team = at(g);
  const playerIdx = state.selectedPlayerIdx;
  const player = team.players[playerIdx];

  // Snapshot for undo
  state.history.push({
    teamNum:    state.activeTeam,
    playerIdx,
    prevStats:  JSON.parse(JSON.stringify(player.stats)),
    prevScore:  team.score,
  });

  let ptsAdded = 0;

  switch (statKey) {
    case 'ftm':     player.stats.ftm++;  player.stats.fta++;  ptsAdded = 1; break;
    case 'fgm2':    player.stats.fgm2++; player.stats.fga2++; ptsAdded = 2; break;
    case 'fgm3':    player.stats.fgm3++; player.stats.fga3++; ptsAdded = 3; break;
    case 'ftmiss':  player.stats.fta++;  break;
    case 'fgmiss2': player.stats.fga2++; break;
    case 'fgmiss3': player.stats.fga3++; break;
    default:        player.stats[statKey]++;
  }

  team.score += ptsAdded;

  saveCurrentGame();
  closeStatModal();
  renderGameScreen();

  if (ptsAdded > 0) showToast(`+${ptsAdded} pts`);
  else showToast(statLabel(statKey));
}

function statLabel(key) {
  const all = [...SCORING_STATS, ...MISS_STATS, ...OTHER_STATS];
  const def = all.find(s => s.key === key);
  return def ? def.label : key;
}

function undoLast() {
  if (state.history.length === 0) { showToast('Nothing to undo'); return; }

  const snap = state.history.pop();
  const g = state.currentGame;
  const team = snap.teamNum === 1 ? g.team1 : g.team2;

  team.players[snap.playerIdx].stats = snap.prevStats;
  team.score = snap.prevScore;

  saveCurrentGame();
  renderGameScreen();
  showToast('Undone');
}

function confirmEndGame() {
  if (confirm('End the game and view final stats?')) endGame();
}

function endGame() {
  const g = state.currentGame;
  g.finished = true;

  state.games.push(g);
  saveGames();
  localStorage.removeItem('bball-current');

  state.viewingGameIdx = state.games.length - 1;
  state.currentGame = null;
  state.history = [];

  showScreen('summary');
  renderSummary(state.games[state.viewingGameIdx]);
}

// ===== SUMMARY SCREEN =====
function viewGame(idx) {
  state.viewingGameIdx = idx;
  showScreen('summary');
  renderSummary(state.games[idx]);
}

function renderSummary(g) {
  const content = document.getElementById('summary-content');
  const winner = g.team1.score > g.team2.score ? 1
               : g.team2.score > g.team1.score ? 2 : 0;

  content.innerHTML = `
    <div class="summary-score-card">
      <div class="summary-team">
        <div class="summary-team-name" style="color:${g.team1.color}">${escHtml(g.team1.name)}</div>
        <div class="summary-team-score" style="color:${g.team1.color}">${g.team1.score}</div>
        ${winner === 1 ? '<span class="summary-winner-badge">WIN</span>' : ''}
      </div>
      <div class="summary-vs">vs</div>
      <div class="summary-team">
        <div class="summary-team-name" style="color:${g.team2.color}">${escHtml(g.team2.name)}</div>
        <div class="summary-team-score" style="color:${g.team2.color}">${g.team2.score}</div>
        ${winner === 2 ? '<span class="summary-winner-badge">WIN</span>' : ''}
      </div>
    </div>
    ${teamTable(g.team1)}
    ${teamTable(g.team2)}
    <div class="summary-actions">
      <button class="btn-export" onclick="exportGame()">&#128229; Export as Text</button>
      <button class="btn-delete" onclick="deleteGame()">Delete Game</button>
    </div>
  `;
}

function teamTable(team) {
  const rows = team.players.map(p => {
    const pts  = calcPts(p);
    const reb  = (p.stats.oreb || 0) + (p.stats.dreb || 0);
    const fga  = (p.stats.fga2 || 0) + (p.stats.fga3 || 0);
    const fgm  = (p.stats.fgm2 || 0) + (p.stats.fgm3 || 0);
    const fgp  = fga > 0 ? Math.round(fgm / fga * 100) + '%' : '-';
    const ftp  = p.stats.fta > 0 ? Math.round(p.stats.ftm / p.stats.fta * 100) + '%' : '-';
    const name = p.num && p.num !== '?' ? `#${p.num} ${escHtml(p.name)}` : escHtml(p.name);
    return `
      <tr>
        <td>${name}</td>
        <td class="pts-cell">${pts}</td>
        <td>${reb}</td>
        <td>${p.stats.ast}</td>
        <td class="${p.stats.stl > 0 ? 'positive' : ''}">${p.stats.stl}</td>
        <td class="${p.stats.blk > 0 ? 'positive' : ''}">${p.stats.blk}</td>
        <td class="${p.stats.to > 0 ? 'negative' : ''}">${p.stats.to}</td>
        <td class="${p.stats.pf >= 5 ? 'negative' : ''}">${p.stats.pf}</td>
        <td>${fgp}</td>
        <td>${ftp}</td>
      </tr>`;
  }).join('');

  return `
    <div class="team-stats-section">
      <div class="team-stats-header" style="color:${team.color}">${escHtml(team.name)}</div>
      <div class="stats-scroll">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Player</th><th>PTS</th><th>REB</th><th>AST</th>
              <th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>FG%</th><th>FT%</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function deleteGame() {
  if (!confirm('Delete this game? This cannot be undone.')) return;
  state.games.splice(state.viewingGameIdx, 1);
  saveGames();
  showScreen('home');
}

function exportGame() {
  const g = state.games[state.viewingGameIdx];
  if (!g) return;

  let text = `${g.name}\n`;
  text += `${new Date(g.date).toLocaleDateString()}\n`;
  text += `${g.team1.name} ${g.team1.score} – ${g.team2.score} ${g.team2.name}\n\n`;

  const teamBlock = (team) => {
    let out = `${team.name}\n${'─'.repeat(30)}\n`;
    const header = 'Player               PTS  REB  AST  STL  BLK  TO  PF\n';
    out += header;
    team.players.forEach(p => {
      const pts = calcPts(p);
      const reb = (p.stats.oreb || 0) + (p.stats.dreb || 0);
      const name = (p.num !== '?' ? `#${p.num} ` : '') + p.name;
      const pad = (n, w) => String(n).padStart(w);
      out += `${name.padEnd(20)} ${pad(pts,3)}  ${pad(reb,3)}  ${pad(p.stats.ast,3)}  ${pad(p.stats.stl,3)}  ${pad(p.stats.blk,3)}  ${pad(p.stats.to,2)}  ${pad(p.stats.pf,2)}\n`;
    });
    return out + '\n';
  };

  text += teamBlock(g.team1) + teamBlock(g.team2);

  // Copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
  } else {
    // Fallback: open in new window
    const w = window.open('', '_blank');
    w.document.write('<pre style="font-family:monospace;padding:20px">' + escHtml(text) + '</pre>');
    w.document.close();
  }
}

// ===== PERSISTENCE =====
function saveCurrentGame() {
  localStorage.setItem('bball-current', JSON.stringify(state.currentGame));
}

function saveGames() {
  localStorage.setItem('bball-games', JSON.stringify(state.games));
}

// ===== HELPERS =====
function calcPts(p) {
  return (p.stats.ftm || 0) + (p.stats.fgm2 || 0) * 2 + (p.stats.fgm3 || 0) * 3;
}

function abbr(name) {
  return name.trim().substring(0, 3).toUpperCase();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2200);
}
