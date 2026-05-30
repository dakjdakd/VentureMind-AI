from fastapi.testclient import TestClient

from app.main import create_app


def test_health_route():
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_route():
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["docs"] == "/docs"


def test_create_analysis_route():
    client = TestClient(create_app())

    response = client.post("/api/analyses", json={"idea": "AI compliance analyst for fintech startups"})

    assert response.status_code == 200
    body = response.json()
    assert body["analysisId"]
    assert body["streamUrl"].endswith("/stream")
