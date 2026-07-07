"""Alembic migration 005: semantic search tables."""

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Document embeddings table ──────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS document_embeddings (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id     UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
            embedding       JSONB NOT NULL,
            embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
            source_text_preview VARCHAR(500),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_document_embeddings_document_id ON document_embeddings (document_id);")

    # ── 2. Search history table ───────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS search_history (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            query        TEXT NOT NULL,
            filters      JSONB,
            result_count INTEGER NOT NULL DEFAULT 0,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_history_user_id ON search_history (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_history_created_at ON search_history (created_at);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS search_history;")
    op.execute("DROP TABLE IF EXISTS document_embeddings;")
