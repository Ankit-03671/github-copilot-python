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
let currentHintCount = 0;


// --------------------------------------------------
// Difficulty
// --------------------------------------------------

function getSelectedDifficulty() {
  const select = document.getElementById('difficulty');
  return select ? select.value : 'medium';
}


// --------------------------------------------------
// Theme
// --------------------------------------------------

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
    // Ignore storage failures so gameplay continues.
  }
}

function updateThemeButton() {
  const button = document.getElementById('theme-toggle');

  if (!button) {
    return;
  }

  const isDark = currentTheme === 'dark';

  button.innerText = isDark ? '☀' : '🌙';

  button.setAttribute(
    'aria-label',
    isDark ? 'Switch to light mode' : 'Switch to dark mode'
  );

  button.setAttribute(
    'title',
    isDark ? 'Switch to light mode' : 'Switch to dark mode'
  );
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


// --------------------------------------------------
// Timer
// --------------------------------------------------

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

  timer.innerText = `Time: ${formatElapsedTime(getElapsedSeconds())}`;
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


// --------------------------------------------------
// Leaderboard
// --------------------------------------------------

function loadLeaderboard() {
  try {
    const raw = window.localStorage.getItem(
      LEADERBOARD_STORAGE_KEY
    );

    const entries = raw ? JSON.parse(raw) : [];

    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    window.localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify(entries)
    );
  } catch (error) {
    // Ignore storage failures so gameplay continues.
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

    // Player, Time, Difficulty, Hints
    cell.colSpan = 4;

    cell.className = 'leaderboard-empty';

    cell.innerText =
      'No scores yet. Solve a puzzle to set the first record.';

    row.appendChild(cell);
    tbody.appendChild(row);

    return;
  }

  for (const entry of entries) {
    const row = document.createElement('tr');

    // Player
    const nameCell = document.createElement('td');

    nameCell.innerText = entry.name || 'Anonymous';

    row.appendChild(nameCell);

    // Time
    const timeCell = document.createElement('td');

    timeCell.innerText = formatElapsedTime(
      Number(entry.timeSeconds) || 0
    );

    row.appendChild(timeCell);

    // Difficulty
    const difficultyCell = document.createElement('td');

    difficultyCell.innerText =
      formatDifficultyLabel(entry.difficulty);

    row.appendChild(difficultyCell);

    // Hints
    const hintsCell = document.createElement('td');

    hintsCell.innerText = Number(entry.hints) || 0;

    row.appendChild(hintsCell);

    tbody.appendChild(row);
  }
}

function addLeaderboardEntry(
  name,
  timeSeconds,
  difficulty,
  hints
) {
  const trimmedName = name.trim();

  const entry = {
    name: trimmedName || 'Anonymous',
    timeSeconds: Number(timeSeconds) || 0,
    difficulty,
    hints: Number(hints) || 0,
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

  // Keep only the fastest 10 scores.
  const topTen = entries.slice(0, 10);

  saveLeaderboard(topTen);

  renderLeaderboard();
}


// --------------------------------------------------
// Sudoku board
// --------------------------------------------------

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');

  boardDiv.innerHTML = '';

  for (let row = 0; row < SIZE; row++) {
    const rowDiv = document.createElement('div');

    rowDiv.className = 'sudoku-row';

    for (let col = 0; col < SIZE; col++) {
      const input = document.createElement('input');

      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';

      input.dataset.row = row;
      input.dataset.col = col;

      input.addEventListener('input', (event) => {
        const value = event.target.value
          .replace(/[^1-9]/g, '');

        event.target.value = value;

        updateCurrentBoardFromInputs();

        applyLiveValidationFeedback();
      });

      rowDiv.appendChild(input);
    }

    boardDiv.appendChild(rowDiv);
  }
}

function getBoardInputs() {
  const boardDiv = document.getElementById(
    'sudoku-board'
  );

  return boardDiv.getElementsByTagName('input');
}

function updateCurrentBoardFromInputs() {
  const inputs = getBoardInputs();

  currentBoard = [];

  for (let row = 0; row < SIZE; row++) {
    currentBoard[row] = [];

    for (let col = 0; col < SIZE; col++) {
      const index = row * SIZE + col;

      const value = inputs[index].value;

      currentBoard[row][col] =
        value ? parseInt(value, 10) : 0;
    }
  }
}


// --------------------------------------------------
// Live validation
// --------------------------------------------------

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
        conflicts.add(
          `${cell.row},${cell.col}`
        );

        const previous = seen.get(value);

        conflicts.add(
          `${previous.row},${previous.col}`
        );
      } else {
        seen.set(value, cell);
      }
    }
  }

  // Rows
  for (let row = 0; row < SIZE; row++) {
    markIfDuplicate(
      Array.from(
        { length: SIZE },
        (_, col) => ({ row, col })
      )
    );
  }

  // Columns
  for (let col = 0; col < SIZE; col++) {
    markIfDuplicate(
      Array.from(
        { length: SIZE },
        (_, row) => ({ row, col })
      )
    );
  }

  // 3x3 boxes
  for (let startRow = 0; startRow < SIZE; startRow += 3) {
    for (
      let startCol = 0;
      startCol < SIZE;
      startCol += 3
    ) {
      const cells = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          cells.push({
            row: startRow + row,
            col: startCol + col,
          });
        }
      }

      markIfDuplicate(cells);
    }
  }

  return conflicts;
}

function applyLiveValidationFeedback() {
  const inputs = getBoardInputs();

  const conflicts =
    getConflictKeys(currentBoard);

  for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index];

    if (input.readOnly) {
      continue;
    }

    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);

    input.className =
      'sudoku-cell editable';

    if (conflicts.has(`${row},${col}`)) {
      input.classList.add('invalid');
    }
  }
}


// --------------------------------------------------
// Render puzzle
// --------------------------------------------------

function renderPuzzle(puz) {
  puzzle = puz;

  createBoardElement();

  const inputs = getBoardInputs();

  for (let row = 0; row < SIZE; row++) {
    currentBoard[row] = [];

    for (let col = 0; col < SIZE; col++) {
      const index = row * SIZE + col;

      const value = puzzle[row][col];

      const input = inputs[index];

      if (value !== 0) {
        input.value = value;
        input.readOnly = true;
        input.className =
          'sudoku-cell prefilled';

        currentBoard[row][col] = value;
      } else {
        input.value = '';
        input.readOnly = false;
        input.className =
          'sudoku-cell editable';

        currentBoard[row][col] = 0;
      }
    }
  }

  applyLiveValidationFeedback();
}


// --------------------------------------------------
// Hint
// --------------------------------------------------

function applyHintToBoard(row, col, value) {
  const inputs = getBoardInputs();

  const index = row * SIZE + col;

  const input = inputs[index];

  if (!input) {
    return false;
  }

  puzzle[row][col] = value;

  currentBoard[row][col] = value;

  input.value = value;

  input.readOnly = true;

  input.className =
    'sudoku-cell prefilled hinted';

  applyLiveValidationFeedback();

  return true;
}

async function requestHint() {
  const message =
    document.getElementById('message');

  try {
    const response = await fetch('/hint', {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      message.style.color = '#d32f2f';

      message.innerText =
        data.error || 'Unable to get a hint.';

      return;
    }

    const applied = applyHintToBoard(
      data.row,
      data.col,
      data.value
    );

    // Increment only when the hint was successfully applied.
    if (!applied) {
      message.style.color = '#d32f2f';

      message.innerText =
        'Unable to apply the hint.';

      return;
    }

    // Use the server count when available.
    currentHintCount =
      Number.isInteger(data.hintCount)
        ? data.hintCount
        : currentHintCount + 1;

    message.style.color = '#1565c0';

    message.innerText =
      `Hint applied. Hints used: ${currentHintCount}.`;

  } catch (error) {
    message.style.color = '#d32f2f';

    message.innerText =
      'Unable to connect to the server.';
  }
}


// --------------------------------------------------
// New game
// --------------------------------------------------

async function newGame() {
  resetTimer();

  // Reset hint count for every new game.
  currentHintCount = 0;

  currentDifficulty =
    getSelectedDifficulty();

  try {
    const response = await fetch(
      `/new?difficulty=${encodeURIComponent(
        currentDifficulty
      )}`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        data.error || 'Unable to create a new game.'
      );
    }

    renderPuzzle(data.puzzle);

    // Server should return zero for a new game.
    currentHintCount =
      Number.isInteger(data.hintCount)
        ? data.hintCount
        : 0;

    startTimer();

    const message =
      document.getElementById('message');

    message.innerText = '';

  } catch (error) {
    const message =
      document.getElementById('message');

    message.style.color = '#d32f2f';

    message.innerText =
      error.message || 'Unable to start a new game.';
  }
}

// check  solution

async function checkSolution() {
  const inputs = getBoardInputs();
  const message = document.getElementById('message');

  updateCurrentBoardFromInputs();

  try {
    const response = await fetch('/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        board: currentBoard
      })
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error('Invalid server response:', text);

      message.style.color = '#d32f2f';
      message.innerText =
        'Invalid response received from server.';
      return;
    }

    if (!response.ok || data.error) {
      message.style.color = '#d32f2f';
      message.innerText =
        data.error || `Server error: ${response.status}`;
      return;
    }

    const incorrect = Array.isArray(data.incorrect)
      ? data.incorrect
      : [];

    // Remove previous incorrect highlighting.
    for (const input of inputs) {
      if (!input.readOnly) {
        input.classList.remove('invalid');
      }
    }

    // Highlight incorrect cells.
    incorrect.forEach(position => {
      const row = Number(position[0]);
      const col = Number(position[1]);

      if (
        Number.isInteger(row) &&
        Number.isInteger(col) &&
        row >= 0 &&
        row < SIZE &&
        col >= 0 &&
        col < SIZE
      ) {
        const index = row * SIZE + col;

        if (inputs[index] && !inputs[index].readOnly) {
          inputs[index].classList.add('invalid');
        }
      }
    });

    // Check whether the puzzle is completely filled.
    const hasEmptyCell = currentBoard.some(row =>
      row.some(value => value === 0)
    );

    if (hasEmptyCell) {
      message.style.color = '#d32f2f';
      message.innerText =
        'Please complete the puzzle before checking the solution.';
      return;
    }

    // Incorrect solution.
    if (incorrect.length > 0) {
      message.style.color = '#d32f2f';
      message.innerText =
        `${incorrect.length} incorrect cell(s) found.`;
      return;
    }

    // Correct solution.
    stopTimer();

    const timeSeconds = getElapsedSeconds();

    message.style.color = '#388e3c';

    message.innerText =
      `Congratulations! You solved it in ` +
      `${formatElapsedTime(timeSeconds)}. ` +
      `Hints used: ${currentHintCount}.`;

    // Create name entry UI instead of using prompt().
    showPlayerNameForm(timeSeconds);

  } catch (error) {
    console.error('Check Solution error:', error);

    message.style.color = '#d32f2f';

    message.innerText =
      `Check failed: ${error.message}`;
  }
}


function showPlayerNameForm(timeSeconds) {
  const messageRow = document.querySelector('.message-row');

  if (!messageRow) {
    return;
  }

  // Remove an existing form if there is one.
  const existingForm =
    document.getElementById('player-name-form');

  if (existingForm) {
    existingForm.remove();
  }

  const form = document.createElement('div');

  form.id = 'player-name-form';
  form.className = 'player-name-form';

  const label = document.createElement('label');

  label.setAttribute('for', 'player-name');

  label.innerText =
    'Enter your name for the Top 10 leaderboard:';

  const input = document.createElement('input');

  input.id = 'player-name';
  input.type = 'text';
  input.maxLength = 30;
  input.placeholder = 'Your name';
  input.autocomplete = 'name';

  const saveButton = document.createElement('button');

  saveButton.type = 'button';
  saveButton.innerText = 'Save Score';

  saveButton.addEventListener('click', () => {
    const playerName = input.value.trim();

    addLeaderboardEntry(
      playerName,
      timeSeconds,
      currentDifficulty,
      currentHintCount
    );

    form.remove();

    const message =
      document.getElementById('message');

    message.style.color = '#388e3c';

    message.innerText =
      `Score saved! Time: ` +
      `${formatElapsedTime(timeSeconds)}. ` +
      `Hints used: ${currentHintCount}.`;
  });

  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(saveButton);

  messageRow.appendChild(form);

  input.focus();
}



// --------------------------------------------------
// Initialize application
// --------------------------------------------------

window.addEventListener('load', () => {
  document
    .getElementById('new-game')
    .addEventListener('click', newGame);

  document
    .getElementById('check-solution')
    .addEventListener('click', checkSolution);

  document
    .getElementById('hint-button')
    .addEventListener('click', requestHint);

  document
    .getElementById('theme-toggle')
    .addEventListener('click', toggleTheme);

  document
    .getElementById('difficulty')
    .addEventListener('change', newGame);

  // Initialize theme.
  applyTheme(getSavedTheme());

  // Initialize timer.
  renderTimer();

  // Load saved leaderboard.
  renderLeaderboard();

  // Start the first game.
  newGame();
});