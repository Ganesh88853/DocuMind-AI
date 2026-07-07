import httpx
import json

base = "http://localhost:8000"

print("Diagnosing register error...")
print()

r = httpx.post(f"{base}/api/v1/auth/register", json={
    "full_name": "Test User",
    "email": "testuser@gmail.com",
    "password": "TestPass@123",
    "confirm_password": "TestPass@123"
}, timeout=15)

print(f"Status Code : {r.status_code}")
print(f"Response    : {r.text}")
