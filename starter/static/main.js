// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
const LEADERBOARD_STORAGE_KEY = 'sudoku-leaderboard-v1';
const THEME_STORAGE_KEY = 'sudoku-theme-v1';
let puzzle = [];
let currentBoard = [];
let timerIntervalId = null;
let timerStartTime = null;
let currentDifficulty = 'medium';
let currentTheme = 'light';

function getSelectedDifficulty() {
  const select = document.getElementById('difficulty');
  return select ? select.value : 'medium';
}

function getSavedTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  } catch (error) {
    return 'light';
  }
}

function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Ignore storage failures so gameplay still works.
  }
}

function updateThemeButton() {
  const button = document.getElementById('theme-toggle');
  if (!button) {
    return;
  }

  const isDark = currentTheme === 'dark';
  button.innerText = isDark ? '☀' : '🌙';
  button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  button.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function applyTheme(theme) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = currentTheme;
  saveTheme(currentTheme);
  updateThemeButton();
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function formatElapsedTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getElapsedSeconds() {
  if (!timerStartTime) {
    return 0;
  }
  return Math.floor((Date.now() - timerStartTime) / 1000);
}

function renderTimer() {
  const timer = document.getElementById('timer');
  if (!timer) {
    return;
  }

  const elapsedSeconds = getElapsedSeconds();
  timer.innerText = `Time: ${formatElapsedTime(elapsedSeconds)}`;
}

function startTimer() {
  stopTimer();
  timerStartTime = Date.now();
  renderTimer();
  timerIntervalId = window.setInterval(renderTimer, 1000);
}

function stopTimer() {
  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function resetTimer() {
  stopTimer();
  timerStartTime = null;
  renderTimer();
}

function loadLeaderboard() {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    // Ignore storage failures so gameplay still works.
  }
}

function formatDifficultyLabel(difficulty) {
  if (!difficulty) {
    return 'Medium';
  }
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) {
    return;
  }

  const entries = loadLeaderboard();
  tbody.innerHTML = '';

  if (entries.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.className = 'leaderboard-empty';
    cell.innerText = 'No scores yet. Solve a puzzle to set the first record.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.innerText = entry.name;
    row.appendChild(nameCell);

    const timeCell = document.createElement('td');
    timeCell.innerText = formatElapsedTime(entry.timeSeconds);
    row.appendChild(timeCell);

    const difficultyCell = document.createElement('td');
    difficultyCell.innerText = formatDifficultyLabel(entry.difficulty);
    row.appendChild(difficultyCell);

    tbody.appendChild(row);
  }
}

function addLeaderboardEntry(name, timeSeconds, difficulty) {
  const trimmedName = name.trim();
  const entry = {
    name: trimmedName || 'Anonymous',
    timeSeconds,
    difficulty,
    createdAt: Date.now(),
  };

  const entries = loadLeaderboard();
  entries.push(entry);
  entries.sort((left, right) => {
    if (left.timeSeconds !== right.timeSeconds) {
      return left.timeSeconds - right.timeSeconds;
    }
    return left.createdAt - right.createdAt;
  });

  saveLeaderboard(entries.slice(0, 10));
  renderLeaderboard();
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
        updateCurrentBoardFromInputs();
        applyLiveValidationFeedback();
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function getBoardInputs() {
  const boardDiv = document.getElementById('sudoku-board');
  return boardDiv.getElementsByTagName('input');
}

function updateCurrentBoardFromInputs() {
  const inputs = getBoardInputs();
  currentBoard = [];
  for (let i = 0; i < SIZE; i++) {
    currentBoard[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      currentBoard[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
}

function getConflictKeys(board) {
  const conflicts = new Set();

  function markIfDuplicate(cells) {
    const seen = new Map();
    for (const cell of cells) {
      const value = board[cell.row][cell.col];
      if (value === 0) {
        continue;
      }
      if (seen.has(value)) {
        conflicts.add(`${cell.row},${cell.col}`);
        conflicts.add(`${seen.get(value).row},${seen.get(value).col}`);
      } else {
        seen.set(value, cell);
      }
    }
  }

  for (let row = 0; row < SIZE; row++) {
    markIfDuplicate(Array.from({ length: SIZE }, (_, col) => ({ row, col })));
  }

  for (let col = 0; col < SIZE; col++) {
    markIfDuplicate(Array.from({ length: SIZE }, (_, row) => ({ row, col })));
  }

  for (let startRow = 0; startRow < SIZE; startRow += 3) {
    for (let startCol = 0; startCol < SIZE; startCol += 3) {
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          cells.push({ row: startRow + row, col: startCol + col });
        }
      }
      markIfDuplicate(cells);
    }
  }

  return conflicts;
}

function applyLiveValidationFeedback() {
  const inputs = getBoardInputs();
  const conflictKeys = getConflictKeys(currentBoard);

  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.readOnly) {
      continue;
    }

    const row = Number(inp.dataset.row);
    const col = Number(inp.dataset.col);
    inp.className = 'sudoku-cell editable';
    if (conflictKeys.has(`${row},${col}`)) {
      inp.classList.add('invalid');
    }
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const inputs = getBoardInputs();
  for (let i = 0; i < SIZE; i++) {
    currentBoard[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.readOnly = true;
        inp.classList.add('prefilled');
        currentBoard[i][j] = val;
      } else {
        inp.value = '';
        inp.readOnly = false;
        inp.classList.add('editable');
        currentBoard[i][j] = 0;
      }
    }
  }
  applyLiveValidationFeedback();
}

function applyHintToBoard(row, col, value) {
  const inputs = getBoardInputs();
  const idx = row * SIZE + col;
  const inp = inputs[idx];
  if (!inp) {
    return;
  }

  puzzle[row][col] = value;
  currentBoard[row][col] = value;
  inp.value = value;
  inp.readOnly = true;
  inp.className = 'sudoku-cell prefilled hinted';
  applyLiveValidationFeedback();
}

async function newGame() {
  resetTimer();
  currentDifficulty = getSelectedDifficulty();
  const res = await fetch(`/new?difficulty=${encodeURIComponent(currentDifficulty)}`);
  const data = await res.json();
  renderPuzzle(data.puzzle);
  startTimer();
  document.getElementById('message').innerText = '';
}

async function requestHint() {
  const res = await fetch('/hint', { method: 'POST' });
  const data = await res.json();
  const msg = document.getElementById('message');

  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }

  applyHintToBoard(data.row, data.col, data.value);
  msg.style.color = '#1565c0';
  msg.innerText = 'Hint applied.';
}

async function checkSolution() {
  const inputs = getBoardInputs();
  updateCurrentBoardFromInputs();
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board: currentBoard})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.readOnly) continue;
    if (incorrect.has(idx)) {
      inp.classList.add('invalid');
    } else {
      inp.classList.remove('invalid');
    }
  }
  if (incorrect.size === 0) {
    stopTimer();
    const timeSeconds = getElapsedSeconds();
    const playerName = window.prompt('Puzzle solved! Enter your name for the leaderboard:', 'Player');
    if (playerName !== null) {
      addLeaderboardEntry(playerName, timeSeconds, currentDifficulty);
    }
    msg.style.color = '#388e3c';
    msg.innerText = `Congratulations! You solved it in ${formatElapsedTime(timeSeconds)}.`;
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint-button').addEventListener('click', requestHint);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('difficulty').addEventListener('change', newGame);
  // initialize
  applyTheme(getSavedTheme());
  renderTimer();
  renderLeaderboard();
  newGame();
});