"""Alembic migration 003: add OCR enum values and document_contents table."""

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Extend documentstatus enum with new values ────────────────────────
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction in older PG,
    # but PG 12+ supports it. We use individual statements for safety.
    for val in ("OCR_PROCESSING", "OCR_COMPLETED", "OCR_FAILED", "AI_PROCESSING", "COMPLETED"):
        op.execute(f"ALTER TYPE documentstatus ADD VALUE IF NOT EXISTS '{val}';")

    # ── 2. Create document_contents table ────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_contents (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id       UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
            extracted_text    TEXT,
            total_pages       INTEGER,
            detected_language VARCHAR(20),
            processing_time   FLOAT,
            ocr_engine        VARCHAR(50),
            error_message     TEXT,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    op.execute("CREATE INDEX IF NOT EXISTS ix_document_contents_document_id ON document_contents (document_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS document_contents;")
    # Note: PostgreSQL does not support removing enum values — downgrade only drops the table
