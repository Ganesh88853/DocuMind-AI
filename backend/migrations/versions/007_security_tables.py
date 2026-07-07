"""Alembic migration 007: security tables — user_sessions, refresh_token_revocations, audit_logs."""

from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. User sessions table ─────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            refresh_jti     VARCHAR(64) NOT NULL UNIQUE,
            ip_address      VARCHAR(45),
            user_agent      VARCHAR(512),
            device_hint     VARCHAR(200),
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at      TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_refresh_jti ON user_sessions(refresh_jti)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_sessions_is_active ON user_sessions(is_active)")

    # ── 2. Refresh token revocations (deny-list) ───────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS refresh_token_revocations (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            jti         VARCHAR(64) NOT NULL UNIQUE,
            revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            reason      TEXT NOT NULL DEFAULT 'logout'
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_revocations_jti ON refresh_token_revocations(jti)")

    # ── 3. Audit log table ─────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID,
            action          VARCHAR(100) NOT NULL,
            resource_type   VARCHAR(50),
            resource_id     VARCHAR(100),
            ip_address      VARCHAR(45),
            user_agent      VARCHAR(512),
            metadata        JSONB,
            timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs(timestamp)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.execute("DROP TABLE IF EXISTS refresh_token_revocations")
    op.execute("DROP TABLE IF EXISTS user_sessions")
