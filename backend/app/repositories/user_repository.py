"""
User repository — data-access layer for User operations.
All database interactions are isolated here; no raw SQL in services or routes.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.core.security import hash_password


class UserRepository:
    """Encapsulates all database operations for the User model."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email address. Returns None if not found."""
        result = await self.session.execute(
            select(User).where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch a user by UUID primary key. Returns None if not found."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: RegisterRequest) -> User:
        """
        Persist a new User to the database.
        Hashes the password before storage — never stores plain text.
        """
        user = User(
            full_name=data.full_name.strip(),
            email=data.email.lower().strip(),
            password_hash=hash_password(data.password),
        )
        self.session.add(user)
        await self.session.flush()   # Assigns the UUID without committing
        await self.session.refresh(user)
        return user

    async def update_last_login(self, user: User) -> User:
        """Stamp the user's last_login timestamp to now."""
        user.last_login = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update_password(self, user: User, new_password: str) -> User:
        """Hash and update the user's password."""
        from app.core.security import hash_password
        user.password_hash = hash_password(new_password)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update_verified(self, user: User, verified: bool = True) -> User:
        user.is_verified = verified
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def list_all(self, limit: int = 50, offset: int = 0):
        """Admin: list all users ordered by creation date."""
        result = await self.session.execute(
            select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all())
