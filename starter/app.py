from flask import Flask, render_template, jsonify, request
import sudoku_logic

app = Flask(__name__)

# Store the current puzzle, solution, and hint count.
CURRENT = {
    'puzzle': None,
    'solution': None,
    'hint_count': 0,
}


def get_request_difficulty():
    """Return the requested difficulty or use medium by default."""
    return request.args.get('difficulty', 'medium')


def get_request_clues():
    """Return the requested clue count when it is a valid integer."""
    clues = request.args.get('clues')

    if clues is None:
        return None

    try:
        return int(clues)
    except (TypeError, ValueError):
        return None


def store_current_game(puzzle, solution):
    """Store a new game and reset its hint count."""
    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['hint_count'] = 0


def has_locked_cell_changed(board, puzzle):
    """Return True if a pre-filled puzzle cell was changed."""
    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if (
                puzzle[row][col] != sudoku_logic.EMPTY
                and board[row][col] != puzzle[row][col]
            ):
                return True

    return False


def get_empty_cells(board):
    """Return coordinates of all empty cells."""
    empty_cells = []

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if board[row][col] == sudoku_logic.EMPTY:
                empty_cells.append((row, col))

    return empty_cells


@app.route('/')
def index():
    """Render the Sudoku game page."""
    return render_template('index.html')


@app.route('/new')
def new_game():
    """Create and store a new Sudoku puzzle."""
    clues = get_request_clues()
    difficulty = get_request_difficulty()

    puzzle, solution = sudoku_logic.generate_puzzle(
        clues=clues,
        difficulty=difficulty,
    )

    store_current_game(puzzle, solution)

    return jsonify({
        'puzzle': puzzle,
        'hintCount': CURRENT['hint_count'],
    })


@app.route('/check', methods=['POST'])
def check_solution():
    """Check the submitted Sudoku board against the solution."""
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            'error': 'Invalid JSON body'
        }), 400

    board = data.get('board')

    # Validate the board shape.
    if (
        not isinstance(board, list)
        or len(board) != sudoku_logic.SIZE
        or any(
            not isinstance(row, list)
            or len(row) != sudoku_logic.SIZE
            for row in board
        )
    ):
        return jsonify({
            'error': 'Invalid board format'
        }), 400

    # Make sure a game exists.
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')

    if puzzle is None or solution is None:
        return jsonify({
            'error': 'No game in progress'
        }), 400

    # Convert submitted values to integers.
    try:
        for row in range(sudoku_logic.SIZE):
            for col in range(sudoku_logic.SIZE):
                value = board[row][col]

                if isinstance(value, str) and value.isdigit():
                    board[row][col] = int(value)
                elif not isinstance(value, int):
                    board[row][col] = int(value)

    except (TypeError, ValueError):
        return jsonify({
            'error': 'Invalid board values'
        }), 400

    # Prevent modification of locked cells.
    if has_locked_cell_changed(board, puzzle):
        return jsonify({
            'error': 'Locked cells cannot be changed'
        }), 400

    # Find incorrect cells.
    incorrect = []

    for row in range(sudoku_logic.SIZE):
        for col in range(sudoku_logic.SIZE):
            if board[row][col] != solution[row][col]:
                incorrect.append([row, col])

    return jsonify({
        'incorrect': incorrect
    })


@app.route('/hint', methods=['POST'])
def get_hint():
    """Fill one empty cell with the correct value."""
    puzzle = CURRENT.get('puzzle')
    solution = CURRENT.get('solution')

    if puzzle is None or solution is None:
        return jsonify({
            'error': 'No game in progress'
        }), 400

    empty_cells = get_empty_cells(puzzle)

    if not empty_cells:
        return jsonify({
            'error': 'No hints available'
        }), 400

    # sudoku_logic already imports random.
    row, col = sudoku_logic.random.choice(empty_cells)

    value = solution[row][col]

    # Apply the hint to the current puzzle.
    puzzle[row][col] = value

    # Increase hint count only after successfully applying it.
    CURRENT['hint_count'] += 1

    return jsonify({
        'row': row,
        'col': col,
        'value': value,
        'hintCount': CURRENT['hint_count'],
    })


if __name__ == '__main__':
    app.run(debug=True)