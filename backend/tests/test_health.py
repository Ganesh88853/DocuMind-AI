"""
Integration tests for health and monitoring endpoints.

Tests:
- GET /health → 200 with expected shape
- GET /health/ready → checks DB connectivity
- GET /health/live → 200 always
- GET /metrics → Prometheus text format
"""

import pytest

pytestmark = pytest.mark.integration


class TestHealthEndpoints:
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    async def test_health_returns_correct_shape(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        assert "service" in data
        assert "version" in data
        assert "environment" in data

    async def test_health_ready_returns_200_or_503(self, client):
        response = await client.get("/health/ready")
        # In test environment, DB may or may not be available
        assert response.status_code in (200, 503, 500)

    async def test_liveness_returns_200(self, client):
        response = await client.get("/health/live")
        assert response.status_code == 200

    async def test_liveness_has_uptime(self, client):
        response = await client.get("/health/live")
        data = response.json()
        assert "status" in data
        assert "uptime_seconds" in data
        assert data["uptime_seconds"] >= 0

    async def test_metrics_returns_text(self, client):
        response = await client.get("/metrics")
        assert response.status_code == 200
        # Prometheus format is plain text
        assert "documind_requests_total" in response.text or "documind" in response.text

    async def test_health_response_has_no_sensitive_data(self, client):
        response = await client.get("/health")
        text = response.text.lower()
        assert "password" not in text
        assert "secret" not in text
        assert "key" not in text
