import sudoku_logic


def test_create_empty_board():
    board = sudoku_logic.create_empty_board()

    assert len(board) == 9
    assert all(len(row) == 9 for row in board)
    assert all(
        cell == sudoku_logic.EMPTY
        for row in board
        for cell in row
    )


def test_fill_board_creates_valid_board():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board) is True

    # Check every row contains 1-9
    for row in board:
        assert sorted(row) == list(range(1, 10))

    # Check every column contains 1-9
    for col in range(9):
        values = [board[row][col] for row in range(9)]
        assert sorted(values) == list(range(1, 10))


def test_unique_solution():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board) is True

    # A completely solved valid board has exactly one solution.
    assert sudoku_logic.has_unique_solution(board) is True


def test_generate_puzzle_easy_medium_hard():
    easy, easy_solution = sudoku_logic.generate_puzzle(
        difficulty="easy"
    )
    medium, medium_solution = sudoku_logic.generate_puzzle(
        difficulty="medium"
    )
    hard, hard_solution = sudoku_logic.generate_puzzle(
        difficulty="hard"
    )

    # Every generated solution should be a valid Sudoku.
    for solution in [easy_solution, medium_solution, hard_solution]:
        for row in solution:
            assert sorted(row) == list(range(1, 10))

    # Difficulty levels should contain the expected number of clues.
    easy_clues = sum(
        cell != sudoku_logic.EMPTY
        for row in easy
        for cell in row
    )

    medium_clues = sum(
        cell != sudoku_logic.EMPTY
        for row in medium
        for cell in row
    )

    hard_clues = sum(
        cell != sudoku_logic.EMPTY
        for row in hard
        for cell in row
    )

    assert easy_clues == sudoku_logic.DIFFICULTY_CLUES["easy"]
    assert medium_clues == sudoku_logic.DIFFICULTY_CLUES["medium"]
    assert hard_clues == sudoku_logic.DIFFICULTY_CLUES["hard"]


def test_generated_puzzle_has_unique_solution():
    puzzle, solution = sudoku_logic.generate_puzzle(
        difficulty="medium"
    )

    assert sudoku_logic.has_unique_solution(puzzle) is True

    # The returned solution should remain a complete Sudoku.
    for row in solution:
        assert sorted(row) == list(range(1, 10))