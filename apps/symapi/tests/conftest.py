import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def post(client):
    """Posts a JSON body and returns the response, whatever its status."""

    def post(path: str, **body):
        return client.post(path, json=body)

    return post
