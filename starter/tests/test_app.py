import pytest
from app import app, CURRENT


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_hint_count_resets_and_increments_per_game(client):
    first_response = client.get('/new?difficulty=easy')
    assert first_response.status_code == 200
    first_payload = first_response.get_json()
    assert first_payload['hintCount'] == 0

    hint_response = client.post('/hint')
    assert hint_response.status_code == 200
    hint_payload = hint_response.get_json()
    assert hint_payload['hintCount'] == 1
    assert CURRENT['hint_count'] == 1

    second_response = client.get('/new?difficulty=easy')
    assert second_response.status_code == 200
    second_payload = second_response.get_json()
    assert second_payload['hintCount'] == 0
    assert CURRENT['hint_count'] == 0
