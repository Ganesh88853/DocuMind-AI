"""Alembic migration 004: AI intelligence tables and columns."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add AI columns to documents table ─────────────────────────────────
    op.execute("""
        ALTER TABLE documents
            ADD COLUMN IF NOT EXISTS subcategory     VARCHAR(100),
            ADD COLUMN IF NOT EXISTS summary         TEXT,
            ADD COLUMN IF NOT EXISTS ai_confidence   FLOAT,
            ADD COLUMN IF NOT EXISTS processed_at    TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS ai_metadata     JSONB,
            ADD COLUMN IF NOT EXISTS ai_error        TEXT;
    """)

    # ── 2. Create tags table ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        VARCHAR(100) NOT NULL UNIQUE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_tags_name ON tags (name);")

    # ── 3. Create document_tags join table ────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_tags (
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (document_id, tag_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_document_tags_document_id ON document_tags (document_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_document_tags_tag_id ON document_tags (tag_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS document_tags;")
    op.execute("DROP TABLE IF EXISTS tags;")
    op.execute("""
        ALTER TABLE documents
            DROP COLUMN IF EXISTS subcategory,
            DROP COLUMN IF EXISTS summary,
            DROP COLUMN IF EXISTS ai_confidence,
            DROP COLUMN IF EXISTS processed_at,
            DROP COLUMN IF EXISTS ai_metadata,
            DROP COLUMN IF EXISTS ai_error;
    """)
