"""Alembic migration 006: assistant conversations and messages tables."""

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Conversations table ─────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title       VARCHAR(200),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_created_at ON conversations (created_at DESC);")

    # ── 2. Messages table ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role                VARCHAR(20) NOT NULL,
            content             TEXT NOT NULL,
            citations           JSONB,
            retrieved_doc_ids   JSONB,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_created_at ON messages (created_at);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS messages;")
    op.execute("DROP TABLE IF EXISTS conversations;")
