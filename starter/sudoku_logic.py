import copy
import random

SIZE = 9
EMPTY = 0
DIFFICULTY_CLUES = {
    'easy': 42,
    'medium': 34,
    'hard': 28,
}

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def find_empty_cell(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                return row, col
    return None

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    empty_cell = find_empty_cell(board)
    if empty_cell is None:
        return True

    row, col = empty_cell
    possible = list(range(1, SIZE + 1))
    random.shuffle(possible)
    for candidate in possible:
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            if fill_board(board):
                return True
            board[row][col] = EMPTY
    return False

def count_solutions(board, limit=2):
    empty_cell = find_empty_cell(board)
    if empty_cell is None:
        return 1

    row, col = empty_cell
    solution_count = 0
    for candidate in range(1, SIZE + 1):
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            solution_count += count_solutions(board, limit)
            board[row][col] = EMPTY
            if solution_count >= limit:
                return solution_count
    return solution_count

def has_unique_solution(board):
    return count_solutions(deep_copy(board), limit=2) == 1

def carve_puzzle(board, clues):
    target_removals = SIZE * SIZE - clues
    positions = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(positions)

    removed = 0
    for row, col in positions:
        if removed >= target_removals:
            break
        if board[row][col] == EMPTY:
            continue

        saved_value = board[row][col]
        board[row][col] = EMPTY
        if has_unique_solution(board):
            removed += 1
        else:
            board[row][col] = saved_value

    return board, removed

def resolve_clues(clues=None, difficulty='medium'):
    if clues is not None:
        return max(17, min(SIZE * SIZE, int(clues)))
    return DIFFICULTY_CLUES.get(difficulty, DIFFICULTY_CLUES['medium'])

def generate_puzzle(clues=None, difficulty='medium'):
    clues = resolve_clues(clues, difficulty)
    for _ in range(100):
        board = create_empty_board()
        if not fill_board(board):
            continue

        solution = deep_copy(board)
        puzzle, removed = carve_puzzle(board, clues)
        if removed == SIZE * SIZE - clues and has_unique_solution(puzzle):
            return deep_copy(puzzle), solution

    raise RuntimeError('Failed to generate a unique Sudoku puzzle')
