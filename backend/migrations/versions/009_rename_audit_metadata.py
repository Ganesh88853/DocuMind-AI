"""Alembic migration 009: rename audit_logs.metadata → extra_data."""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The original migration 007 created the column as 'metadata'
    # The ORM model was later renamed to 'extra_data' to avoid SQLAlchemy conflict.
    # Rename the column in the DB to match.
    op.execute("""
        ALTER TABLE audit_logs
        RENAME COLUMN metadata TO extra_data
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE audit_logs
        RENAME COLUMN extra_data TO metadata
    """)
