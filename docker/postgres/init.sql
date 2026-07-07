-- =============================================================================
-- DocuMind AI — PostgreSQL Initialization Script
-- Runs automatically when the postgres container starts for the first time
-- (Docker mounts scripts in /docker-entrypoint-initdb.d/)
-- =============================================================================

-- Create the production application database
-- (the default 'documind_ai' DB is already created by POSTGRES_DB env var)

-- Create the test database so integration tests can run inside Docker
CREATE DATABASE documind_test;

-- Grant full access on both databases to the app user
GRANT ALL PRIVILEGES ON DATABASE documind_ai TO postgres;
GRANT ALL PRIVILEGES ON DATABASE documind_test TO postgres;

-- Log that init completed
DO $$ BEGIN
    RAISE NOTICE 'DocuMind AI databases initialized: documind_ai, documind_test';
END $$;
