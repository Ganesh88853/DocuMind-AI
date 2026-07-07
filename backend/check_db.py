import psycopg2

conn = psycopg2.connect(
    host="localhost", port=5432,
    user="postgres", password="postgres",
    dbname="documind_ai"
)
cur = conn.cursor()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = [r[0] for r in cur.fetchall()]
print("Tables in documind_ai:", tables)

if "users" in tables:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    print("users columns:", cols)
    cur.execute("SELECT COUNT(*) FROM users")
    print("Users count:", cur.fetchone()[0])
    print()
    print("PASS -- users table exists and is ready!")
else:
    print("FAIL -- users table does NOT exist. Running migration needed.")

conn.close()
