#!/usr/bin/env bash
# =============================================================================
# DocuMind AI — Seed Development Database
# =============================================================================
# Creates test users and sample documents for development.
#
# Usage:
#   ./scripts/seed.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[seed]${NC} $*"; }

cd "$PROJECT_ROOT"

log "Seeding development database..."

docker exec documind-backend python - <<'PYTHON'
import asyncio, sys, os

async def seed():
    from app.database.database import engine, Base, get_db
    from app.models.user import User
    from app.core.security import hash_password
    import uuid

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    seed_users = [
        {"full_name": "Admin User",  "email": "admin@documind.ai",  "role": "admin",  "password": "Admin@123"},
        {"full_name": "Test User",   "email": "user@documind.ai",   "role": "user",   "password": "User@1234"},
        {"full_name": "Demo User",   "email": "demo@documind.ai",   "role": "user",   "password": "Demo@1234"},
    ]

    async with Session() as session:
        for u in seed_users:
            from sqlalchemy import select
            existing = await session.execute(select(User).where(User.email == u["email"]))
            if existing.scalar_one_or_none():
                print(f"  Skipping existing user: {u['email']}")
                continue
            user = User(
                id=uuid.uuid4(),
                full_name=u["full_name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                is_active=True,
                is_verified=True,
            )
            session.add(user)
            print(f"  Created user: {u['email']} (password: {u['password']})")
        await session.commit()
    print("Seed complete!")

asyncio.run(seed())
PYTHON

log "Seed complete. Users:"
log "  admin@documind.ai  /  Admin@123  (admin)"
log "  user@documind.ai   /  User@1234  (user)"
log "  demo@documind.ai   /  Demo@1234  (user)"
