"""Alembic migration 008: add role column to users + file_hash to documents."""

from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add role column to users (default 'user')
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_role ON users(role)")

    # Add file_hash column to documents for SHA-256 deduplication
    op.execute("""
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64)
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_file_hash ON documents(file_hash)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_documents_file_hash")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS file_hash")
    op.execute("DROP INDEX IF EXISTS ix_users_role")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS role")
