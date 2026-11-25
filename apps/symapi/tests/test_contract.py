import json
from pathlib import Path

import pytest

# Recorded from the tests of packages/core, which answer SymAPI requests from this file.
contract = json.loads((Path(__file__).parent / "contract.json").read_text())


def describe(exchange) -> str:
    body = json.dumps(exchange["body"], separators=(",", ":"))
    return f"{exchange['path']} {body[:120]}"


def test_the_contract_is_recorded():
    assert contract, "run `bun run test:record` in packages/core with SymAPI running"


@pytest.mark.parametrize("exchange", contract, ids=describe)
def test_gives_the_recorded_response(post, exchange):
    response = post(exchange["path"], **exchange["body"])
    assert response.status_code == exchange["status"]
    assert response.json() == exchange["response"]
