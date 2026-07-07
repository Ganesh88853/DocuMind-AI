"""Alembic migration 002: create documents table."""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent: create enum only if it does not already exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE documentstatus AS ENUM (
                'UPLOADING', 'READY', 'PROCESSING', 'FAILED', 'ARCHIVED'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Create documents table using raw SQL to avoid Alembic re-creating the enum
    op.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            original_filename VARCHAR(500) NOT NULL,
            stored_filename VARCHAR(500) NOT NULL UNIQUE,
            file_extension  VARCHAR(20) NOT NULL,
            mime_type       VARCHAR(100) NOT NULL,
            file_size       BIGINT NOT NULL,
            storage_path    VARCHAR(1000) NOT NULL,
            category        VARCHAR(100),
            description     TEXT,
            is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
            status          documentstatus NOT NULL DEFAULT 'UPLOADING',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # Indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_id ON documents (id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_owner_id ON documents (owner_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_status ON documents (status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_documents_created_at ON documents (created_at);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS documents;")
    op.execute("DROP TYPE IF EXISTS documentstatus;")
