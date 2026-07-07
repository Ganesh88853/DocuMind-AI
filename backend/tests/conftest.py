"""
Global pytest configuration and fixtures for DocuMind AI tests.

Architecture (proven to work with pytest-asyncio 1.x):
- DB tables are created ONCE using asyncio.run() in a SYNC session fixture
  (avoids event loop conflicts entirely)
- Each test gets its own async function-scoped db session with rollback
- client fixture overrides FastAPI's get_db with the test session
- Unit tests never use any DB fixture
"""

from __future__ import annotations

import asyncio
import os
import uuid
from typing import AsyncGenerator

# ── MUST be set before ANY app module is imported ─────────────────────────────
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/documind_test",
)
os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["JWT_SECRET_KEY"] = "test-secret-key-at-least-32-chars-XXXXXXXXXX"
os.environ["BCRYPT_ROUNDS"] = "4"
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "false"
os.environ["GEMINI_API_KEY"] = "fake-key-for-tests"
os.environ["RATE_LIMIT_AUTH"] = "10000"
os.environ["RATE_LIMIT_GLOBAL"] = "100000"
os.environ["RATE_LIMIT_UPLOAD"] = "10000"
os.environ["RATE_LIMIT_CHAT"] = "10000"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# NullPool: no connection reuse between tests — avoids cross-event-loop issues on Windows
_test_engine = create_async_engine(
    TEST_DB_URL,
    echo=False,
    poolclass=NullPool,  # each request gets a fresh connection — no pool sharing
)
_TestSession = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Sync helper: create/drop tables via asyncio.run() ────────────────────────

def _create_tables_sync():
    """Called once synchronously — avoids session event loop conflicts."""
    from app.database.database import Base
    from app.models import user  # noqa
    try:
        from app.models import document, document_content  # noqa
    except ImportError:
        pass
    try:
        from app.models import user_session, refresh_token_revocation, audit_log  # noqa
    except ImportError:
        pass

    async def _run():
        async with _test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_run())


def _drop_tables_sync():
    async def _run():
        async with _test_engine.begin() as conn:
            from app.database.database import Base
            await conn.run_sync(Base.metadata.drop_all)
        await _test_engine.dispose()

    asyncio.run(_run())


# ── Session-scoped SYNC fixture — tables created once ────────────────────────

@pytest.fixture(scope="session", autouse=False)
def _db_tables():
    """Create all tables once for the session; drop at teardown."""
    _create_tables_sync()
    yield
    _drop_tables_sync()


# ── Per-test DB session with rollback isolation ───────────────────────────────

@pytest.fixture
async def db(_db_tables) -> AsyncGenerator[AsyncSession, None]:
    """Each test gets a fresh rolled-back session — nothing persists."""
    async with _TestSession() as session:
        yield session
        await session.rollback()


# ── HTTP test client ──────────────────────────────────────────────────────────

@pytest.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client with test DB injected — no real network port."""
    from main import app
    from app.database.database import get_db

    async def _override():
        yield db

    app.dependency_overrides[get_db] = _override

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ── User factory ──────────────────────────────────────────────────────────────

class UserFactory:
    @staticmethod
    def build(
        full_name: str = "Test User",
        email: str | None = None,
        password: str = "TestPass@123",
        role: str = "user",
        is_active: bool = True,
        is_verified: bool = True,
    ):
        from app.models.user import User
        from app.core.security import hash_password
        return User(
            id=uuid.uuid4(),
            full_name=full_name,
            email=email or f"user-{uuid.uuid4().hex[:6]}@test.com",
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
            is_verified=is_verified,
        )

    @staticmethod
    async def create(db: AsyncSession, **kwargs):
        u = UserFactory.build(**kwargs)
        db.add(u)
        await db.flush()
        await db.refresh(u)
        return u


@pytest.fixture
def user_factory():
    return UserFactory


@pytest.fixture
async def test_user(db: AsyncSession):
    return await UserFactory.create(db, email="stduser@test.com")


@pytest.fixture
async def admin_user(db: AsyncSession):
    return await UserFactory.create(db, email="adminuser@test.com", role="admin")


# ── Token helpers ─────────────────────────────────────────────────────────────

@pytest.fixture
def make_access_token():
    from app.core.security import create_access_token
    def _make(user_id: str | None = None, role: str = "user") -> str:
        t, _ = create_access_token(subject=user_id or str(uuid.uuid4()), role=role)
        return t
    return _make


@pytest.fixture
def make_auth_headers(make_access_token):
    def _headers(user=None, role: str = "user") -> dict:
        uid = str(user.id) if user else str(uuid.uuid4())
        return {"Authorization": f"Bearer {make_access_token(user_id=uid, role=role)}"}
    return _headers


# ── File fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def sample_pdf_bytes() -> bytes:
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n9\n%%EOF"
    )


@pytest.fixture
def sample_txt_bytes() -> bytes:
    return b"Hello, this is a test document for DocuMind AI testing."
