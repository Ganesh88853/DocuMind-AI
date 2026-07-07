import httpx
import time

base = "http://localhost:8000"
email = f"testuser{int(time.time())}@gmail.com"
password = "TestPass@123"

print()
print("DocuMind AI -- Full Auth Flow Test")
print("=" * 42)

# 1. Register
print(f"[1] Registering: {email}")
r = httpx.post(f"{base}/api/v1/auth/register", json={
    "full_name": "Test User",
    "email": email,
    "password": password,
    "confirm_password": password
}, timeout=10)
print(f"    Status: {r.status_code}")
assert r.status_code == 201, f"FAIL: {r.text}"
data = r.json()
access  = data["access_token"]
refresh = data["refresh_token"]
user    = data["user"]
print(f"    User ID   : {user['id']}")
print(f"    Name      : {user['full_name']}")
print(f"    is_active : {user['is_active']}")
print(f"    password_hash in response: {'password_hash' in str(data)}")
print("    PASS -- Registered!\n")

# 2. GET /me
print("[2] GET /me with token")
r = httpx.get(f"{base}/api/v1/auth/me",
              headers={"Authorization": f"Bearer {access}"}, timeout=10)
print(f"    Status : {r.status_code}")
assert r.status_code == 200
print(f"    Email  : {r.json()['email']}")
print("    PASS -- Profile fetched!\n")

# 3. Login
print("[3] Login")
r = httpx.post(f"{base}/api/v1/auth/login",
               json={"email": email, "password": password}, timeout=10)
print(f"    Status: {r.status_code}")
assert r.status_code == 200
new_access  = r.json()["access_token"]
new_refresh = r.json()["refresh_token"]
print("    PASS -- Login OK!\n")

# 4. Wrong password
print("[4] Wrong password -> 401")
r = httpx.post(f"{base}/api/v1/auth/login",
               json={"email": email, "password": "Wrong@Pass1"}, timeout=10)
print(f"    Status  : {r.status_code}")
assert r.status_code == 401
print(f"    Message : {r.json()['detail']}")
print("    PASS -- Rejected correctly!\n")

# 5. Refresh
print("[5] Token refresh")
r = httpx.post(f"{base}/api/v1/auth/refresh",
               json={"refresh_token": refresh}, timeout=10)
print(f"    Status: {r.status_code}")
assert r.status_code == 200
print("    PASS -- New tokens issued!\n")

# 6. Logout
print("[6] Logout")
r = httpx.post(f"{base}/api/v1/auth/logout",
               headers={"Authorization": f"Bearer {new_access}"}, timeout=10)
print(f"    Status  : {r.status_code}")
assert r.status_code == 200
print(f"    Message : {r.json()['message']}")
print("    PASS -- Logged out!\n")

# 7. Duplicate email
print("[7] Duplicate email -> 409")
r = httpx.post(f"{base}/api/v1/auth/register", json={
    "full_name": "Dup User",
    "email": email,
    "password": password,
    "confirm_password": password
}, timeout=10)
print(f"    Status  : {r.status_code}")
assert r.status_code == 409
print(f"    Message : {r.json()['detail']}")
print("    PASS -- Duplicate blocked!\n")

print("=" * 42)
print("ALL 7 TESTS PASSED")
print("=" * 42)
print()
print(f"  Frontend : http://localhost:5173")
print(f"  Backend  : http://localhost:8000")
print(f"  API Docs : http://localhost:8000/docs")
print()
