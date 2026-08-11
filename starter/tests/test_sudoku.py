import pytest

from app import app, CURRENT
import sudoku_logic


@pytest.fixture
def client():
    app.config["TESTING"] = True

    with app.test_client() as client:
        CURRENT["puzzle"] = None
        CURRENT["solution"] = None
        CURRENT["hint_count"] = 0
        yield client

        CURRENT["puzzle"] = None
        CURRENT["solution"] = None
        CURRENT["hint_count"] = 0


# -------------------------
# Sudoku logic tests
# -------------------------

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

    for row in board:
        assert sorted(row) == list(range(1, 10))

    for col in range(9):
        values = [board[row][col] for row in range(9)]
        assert sorted(values) == list(range(1, 10))


def test_unique_solution():
    board = sudoku_logic.create_empty_board()

    assert sudoku_logic.fill_board(board) is True
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

    for solution in [easy_solution, medium_solution, hard_solution]:
        for row in solution:
            assert sorted(row) == list(range(1, 10))

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

    for row in solution:
        assert sorted(row) == list(range(1, 10))


# -------------------------
# Flask route tests
# -------------------------

def test_new_game_route(client):
    response = client.get("/new?difficulty=easy")

    assert response.status_code == 200

    data = response.get_json()

    assert "puzzle" in data
    assert "hintCount" in data
    assert data["hintCount"] == 0

    assert len(data["puzzle"]) == 9
    assert all(len(row) == 9 for row in data["puzzle"])


def test_hint_route(client):
    client.get("/new?difficulty=easy")

    response = client.post("/hint")

    assert response.status_code == 200

    data = response.get_json()

    assert "row" in data
    assert "col" in data
    assert "value" in data
    assert data["hintCount"] == 1

    assert CURRENT["hint_count"] == 1


def test_hint_route_without_game(client):
    response = client.post("/hint")

    assert response.status_code == 400

    data = response.get_json()

    assert data["error"] == "No game in progress"


def test_check_route_without_game(client):
    board = [[0 for _ in range(9)] for _ in range(9)]

    response = client.post(
        "/check",
        json={"board": board}
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["error"] == "No game in progress"


def test_check_route_rejects_invalid_json(client):
    response = client.post(
        "/check",
        data="this is not json",
        content_type="application/json"
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["error"] == "Invalid JSON body"


def test_check_route_rejects_invalid_board(client):
    client.get("/new?difficulty=easy")

    response = client.post(
        "/check",
        json={"board": [[0, 0]]}
    )

    assert response.status_code == 400

    data = response.get_json()

    assert data["error"] == "Invalid board format"


def test_check_route_accepts_valid_board(client):
    response = client.get("/new?difficulty=easy")

    assert response.status_code == 200

    solution = CURRENT["solution"]

    response = client.post(
        "/check",
        json={"board": solution}
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["incorrect"] == []


def test_hint_count_resets_and_increments_per_game(client):
    first_response = client.get("/new?difficulty=easy")

    assert first_response.status_code == 200

    first_payload = first_response.get_json()

    assert first_payload["hintCount"] == 0

    hint_response = client.post("/hint")

    assert hint_response.status_code == 200

    hint_payload = hint_response.get_json()

    assert hint_payload["hintCount"] == 1
    assert CURRENT["hint_count"] == 1

    second_response = client.get("/new?difficulty=easy")

    assert second_response.status_code == 200

    second_payload = second_response.get_json()

    assert second_payload["hintCount"] == 0
    assert CURRENT["hint_count"] == 0