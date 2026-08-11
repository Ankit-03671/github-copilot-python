import pytest
from app import app, CURRENT


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_new_returns_puzzle_and_hintcount(client):
    res = client.get('/new?difficulty=easy')
    assert res.status_code == 200
    payload = res.get_json()
    assert 'puzzle' in payload
    assert 'hintCount' in payload
    assert payload['hintCount'] == 0


def test_hint_before_new_returns_400(client):
    # Ensure no game in progress
    CURRENT['puzzle'] = None
    CURRENT['solution'] = None
    res = client.post('/hint')
    assert res.status_code == 400


def test_check_before_new_returns_400(client):
    CURRENT['puzzle'] = None
    CURRENT['solution'] = None
    res = client.post('/check', json={'board': [[0]*9 for _ in range(9)]})
    assert res.status_code == 400


def test_check_malformed_json_and_board(client):
    client.get('/new?difficulty=easy')
    # Not-JSON body
    res = client.post('/check', data='not-json', content_type='application/json')
    assert res.status_code == 400

    # Wrong shape
    res = client.post('/check', json={'board': [1,2,3]})
    assert res.status_code == 400

    # Wrong cell values
    res = client.post('/check', json={'board': [[None]*9 for _ in range(9)]})
    assert res.status_code == 400


def test_hint_after_new_increments(client):
    client.get('/new?difficulty=easy')
    res = client.post('/hint')
    assert res.status_code == 200
    payload = res.get_json()
    assert 'hintCount' in payload
    assert payload['hintCount'] >= 1
